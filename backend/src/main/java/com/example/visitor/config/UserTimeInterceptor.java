package com.example.visitor.config;

import com.example.visitor.util.TimeContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;

/**
 * Extracts X-User-Time and X-User-Timezone from every request,
 * validates the client clock drift, and stores them in TimeContext.
 *
 * Drift policy: warn if > 2 min, reject if > 10 min.
 */
public class UserTimeInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(UserTimeInterceptor.class);
    private static final long WARN_DRIFT_SECONDS   = 120;   // 2 min
    private static final long REJECT_DRIFT_SECONDS = 600;   // 10 min

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String timeHeader = request.getHeader("X-User-Time");
        String zoneHeader = request.getHeader("X-User-Timezone");

        ZonedDateTime serverUtc = ZonedDateTime.now(ZoneId.of("UTC"));
        ZoneId clientZone = ZoneId.of("Asia/Kolkata"); // default IST

        if (zoneHeader != null && !zoneHeader.isBlank()) {
            try { clientZone = ZoneId.of(zoneHeader.trim()); }
            catch (Exception e) { log.warn("Invalid timezone header '{}', using default IST", zoneHeader); }
        }

        if (timeHeader != null && !timeHeader.isBlank()) {
            try {
                ZonedDateTime clientTime = ZonedDateTime.parse(timeHeader.trim())
                        .withZoneSameInstant(ZoneId.of("UTC"));

                long driftSeconds = Math.abs(
                        serverUtc.toEpochSecond() - clientTime.toEpochSecond());

                if (driftSeconds > REJECT_DRIFT_SECONDS) {
                    log.warn("⛔ Rejecting request — clock drift {}s exceeds limit. client={} server={}",
                            driftSeconds, clientTime, serverUtc);
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    try { response.getWriter().write("{\"error\":\"Client clock drift too large\"}"); }
                    catch (Exception ignored) {}
                    return false;
                }

                if (driftSeconds > WARN_DRIFT_SECONDS) {
                    log.warn("⚠️ Clock drift {}s detected. client={} server={}", driftSeconds, clientTime, serverUtc);
                }

                TimeContext.set(clientTime, clientZone);
                log.debug("🕐 clientTime={} serverTime={} zone={} drift={}s",
                        clientTime, serverUtc, clientZone, driftSeconds);

            } catch (DateTimeParseException e) {
                log.warn("Could not parse X-User-Time '{}': {}", timeHeader, e.getMessage());
                TimeContext.set(serverUtc, clientZone);
            }
        } else {
            // No client time — use server time
            TimeContext.set(serverUtc, clientZone);
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        TimeContext.clear();
    }
}
