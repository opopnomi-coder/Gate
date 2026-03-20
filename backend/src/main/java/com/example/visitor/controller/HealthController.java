package com.example.visitor.controller;

import com.example.visitor.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class HealthController {

    @Autowired
    private EmailService emailService;

    @Value("${brevo.api.key:NOT_SET}")
    private String brevoApiKey;

    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Smart Gate API");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("message", "Backend is running and accessible");
        return ResponseEntity.ok(response);
    }

    /**
     * Test Brevo HTTP API email sending.
     * Usage: GET /api/test-email?to=someone@example.com
     */
    @GetMapping("/test-email")
    public ResponseEntity<?> testEmail(@RequestParam(defaultValue = "") String to) {
        Map<String, Object> response = new HashMap<>();
        response.put("brevoApiKeyConfigured", !brevoApiKey.isBlank() && !"NOT_SET".equals(brevoApiKey));

        if (to.isBlank()) {
            response.put("status", "SKIPPED");
            response.put("message", "Provide ?to=email@example.com to send a test email");
            return ResponseEntity.ok(response);
        }

        try {
            emailService.sendOTP(to, "123456", "Test User");
            response.put("status", "SUCCESS");
            response.put("message", "Test OTP email sent to " + to);
        } catch (Exception e) {
            response.put("status", "FAILED");
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }
}
