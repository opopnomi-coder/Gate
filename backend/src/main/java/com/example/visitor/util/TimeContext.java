package com.example.visitor.util;

import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Thread-local holder for the client's time and timezone, populated by
 * UserTimeInterceptor on every request.
 */
public final class TimeContext {

    private static final ThreadLocal<ZonedDateTime> CLIENT_TIME = new ThreadLocal<>();
    private static final ThreadLocal<ZoneId>        CLIENT_ZONE = new ThreadLocal<>();

    private TimeContext() {}

    public static void set(ZonedDateTime clientTime, ZoneId zone) {
        CLIENT_TIME.set(clientTime);
        CLIENT_ZONE.set(zone);
    }

    public static ZonedDateTime getClientTime() { return CLIENT_TIME.get(); }
    public static ZoneId        getClientZone()  { return CLIENT_ZONE.get(); }

    /** Server time in UTC — always authoritative. */
    public static ZonedDateTime serverUtc() {
        return ZonedDateTime.now(ZoneId.of("UTC"));
    }

    /** Server time converted to the client's timezone (for display / streak logic). */
    public static ZonedDateTime serverInClientZone() {
        ZoneId z = CLIENT_ZONE.get();
        return ZonedDateTime.now(z != null ? z : ZoneId.of("Asia/Kolkata"));
    }

    public static void clear() {
        CLIENT_TIME.remove();
        CLIENT_ZONE.remove();
    }
}
