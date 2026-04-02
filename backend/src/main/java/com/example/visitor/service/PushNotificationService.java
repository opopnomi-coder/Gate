package com.example.visitor.service;

import com.example.visitor.repository.UserPushTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * PushNotificationService — sends FCM push notifications via the HTTP v1 API.
 *
 * Uses a Firebase service account JSON to obtain short-lived OAuth2 access tokens.
 * No external SDK needed — pure Java HTTP client.
 *
 * Setup:
 *  1. Firebase Console → Project Settings → Cloud Messaging → Manage service accounts
 *  2. Create a JSON key for the firebase-adminsdk service account
 *  3. Set env var on Render: FIREBASE_SERVICE_ACCOUNT_JSON=<entire JSON as one line>
 *  4. Set env var: FIREBASE_PROJECT_ID=<your-project-id>  (e.g. "ritgate-12345")
 */
@Service
@Slf4j
public class PushNotificationService {

    @Value("${firebase.service.account.json:}")
    private String serviceAccountJson;

    @Value("${firebase.project.id:}")
    private String projectId;

    private final UserPushTokenRepository pushTokenRepository;
    private final HttpClient httpClient;

    // Simple in-memory token cache — access tokens are valid for 1 hour
    private volatile String cachedAccessToken = null;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    public PushNotificationService(UserPushTokenRepository pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Send a push notification to all devices registered for a user.
     * Non-fatal — any failure is logged and swallowed.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void sendToUser(String userId, String title, String body, String actionRoute) {
        if (serviceAccountJson == null || serviceAccountJson.isBlank() ||
            projectId == null || projectId.isBlank()) {
            log.debug("Firebase not configured — skipping push for user {}", userId);
            return;
        }
        try {
            var tokens = pushTokenRepository.findByUserId(userId);
            if (tokens.isEmpty()) return;

            String accessToken = getAccessToken();
            if (accessToken == null) return;

            for (var tokenEntity : tokens) {
                String fcmToken = tokenEntity.getPushToken();
                if (fcmToken == null || fcmToken.isBlank()) continue;
                sendV1Push(fcmToken, title, body, actionRoute, accessToken);
            }
        } catch (Exception e) {
            log.warn("⚠️ Push notification failed for user {}: {}", userId, e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void sendToUser(String userId, String title, String body) {
        sendToUser(userId, title, body, null);
    }

    // ── FCM HTTP v1 send ──────────────────────────────────────────────────────

    private void sendV1Push(String fcmToken, String title, String body,
                            String actionRoute, String accessToken) {
        try {
            String dataJson = actionRoute != null && !actionRoute.isEmpty()
                ? String.format(",\"data\":{\"actionRoute\":\"%s\",\"title\":\"%s\",\"body\":\"%s\"}",
                    escapeJson(actionRoute), escapeJson(title), escapeJson(body))
                : String.format(",\"data\":{\"title\":\"%s\",\"body\":\"%s\"}",
                    escapeJson(title), escapeJson(body));

            String json = String.format(
                "{\"message\":{" +
                "\"token\":\"%s\"," +
                "\"notification\":{\"title\":\"%s\",\"body\":\"%s\"}," +
                "\"android\":{\"priority\":\"high\",\"notification\":{\"channel_id\":\"ritgate_main\",\"sound\":\"default\"}}" +
                "%s" +
                "}}",
                fcmToken,
                escapeJson(title), escapeJson(body),
                dataJson
            );

            String url = String.format(
                "https://fcm.googleapis.com/v1/projects/%s/messages:send", projectId);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + accessToken)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                log.info("📲 FCM v1 push sent → {} | {}", userId(fcmToken), title);
            } else {
                log.warn("⚠️ FCM v1 HTTP {} for {}: {}", response.statusCode(), userId(fcmToken), response.body());
                // If token is invalid/unregistered, remove it
                if (response.statusCode() == 404 || response.body().contains("UNREGISTERED")) {
                    pushTokenRepository.deleteByPushToken(fcmToken);
                    log.info("🗑️ Removed stale FCM token");
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Failed to send FCM v1 push: {}", e.getMessage());
        }
    }

    // ── OAuth2 access token via JWT ───────────────────────────────────────────

    private synchronized String getAccessToken() {
        // Return cached token if still valid (with 5-min buffer)
        if (cachedAccessToken != null && Instant.now().isBefore(tokenExpiry.minusSeconds(300))) {
            return cachedAccessToken;
        }
        try {
            // Parse service account JSON manually (no external JSON lib needed)
            String json = serviceAccountJson.trim();
            String clientEmail = extractJsonString(json, "client_email");
            String privateKeyPem = extractJsonString(json, "private_key");
            String tokenUri = extractJsonString(json, "token_uri");

            if (clientEmail == null || privateKeyPem == null) {
                log.warn("⚠️ Invalid service account JSON — missing client_email or private_key");
                return null;
            }
            if (tokenUri == null) tokenUri = "https://oauth2.googleapis.com/token";

            // Build JWT
            String jwt = buildJWT(clientEmail, privateKeyPem, tokenUri);

            // Exchange JWT for access token
            String body = "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt;
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(tokenUri))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                log.warn("⚠️ Failed to get OAuth2 token: HTTP {} — {}", resp.statusCode(), resp.body());
                return null;
            }

            String accessToken = extractJsonString(resp.body(), "access_token");
            String expiresInStr = extractJsonString(resp.body(), "expires_in");
            long expiresIn = expiresInStr != null ? Long.parseLong(expiresInStr) : 3600;

            cachedAccessToken = accessToken;
            tokenExpiry = Instant.now().plusSeconds(expiresIn);
            log.info("✅ FCM OAuth2 token obtained, expires in {}s", expiresIn);
            return accessToken;

        } catch (Exception e) {
            log.warn("⚠️ Failed to get FCM access token: {}", e.getMessage());
            return null;
        }
    }

    private String buildJWT(String clientEmail, String privateKeyPem, String audience) throws Exception {
        long now = Instant.now().getEpochSecond();
        long exp = now + 3600;

        // Header
        String header = Base64.getUrlEncoder().withoutPadding()
            .encodeToString("{\"alg\":\"RS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

        // Payload
        String payload = String.format(
            "{\"iss\":\"%s\",\"scope\":\"https://www.googleapis.com/auth/firebase.messaging\",\"aud\":\"%s\",\"iat\":%d,\"exp\":%d}",
            clientEmail, audience, now, exp);
        String payloadB64 = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(payload.getBytes(StandardCharsets.UTF_8));

        String signingInput = header + "." + payloadB64;

        // Sign with RSA private key
        String pemBody = privateKeyPem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replace("\\n", "")
            .replaceAll("\\s+", "");

        byte[] keyBytes = Base64.getDecoder().decode(pemBody);
        java.security.spec.PKCS8EncodedKeySpec spec = new java.security.spec.PKCS8EncodedKeySpec(keyBytes);
        java.security.KeyFactory kf = java.security.KeyFactory.getInstance("RSA");
        java.security.PrivateKey privateKey = kf.generatePrivate(spec);

        java.security.Signature sig = java.security.Signature.getInstance("SHA256withRSA");
        sig.initSign(privateKey);
        sig.update(signingInput.getBytes(StandardCharsets.UTF_8));
        byte[] signature = sig.sign();

        String sigB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        return signingInput + "." + sigB64;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Minimal JSON string extractor — no external lib needed. */
    private String extractJsonString(String json, String key) {
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx + search.length());
        if (colon < 0) return null;
        int start = json.indexOf('"', colon + 1);
        if (start < 0) return null;
        // Handle escaped quotes
        StringBuilder sb = new StringBuilder();
        int i = start + 1;
        while (i < json.length()) {
            char c = json.charAt(i);
            if (c == '\\' && i + 1 < json.length()) {
                char next = json.charAt(i + 1);
                if (next == '"') { sb.append('"'); i += 2; continue; }
                if (next == 'n') { sb.append('\n'); i += 2; continue; }
                if (next == '\\') { sb.append('\\'); i += 2; continue; }
            }
            if (c == '"') break;
            sb.append(c);
            i++;
        }
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r");
    }

    private String userId(String token) {
        return token.length() > 20 ? token.substring(0, 20) + "…" : token;
    }
}
