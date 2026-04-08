/**
 * Time utilities for consistent, timezone-aware time handling.
 * Always sends UTC ISO strings to the backend; includes IANA timezone.
 */

/** Current device time as UTC ISO 8601 string. */
export const currentISOTime = (): string => new Date().toISOString();

/** IANA timezone string from the device (e.g. "Asia/Kolkata"). */
export const deviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
};

/**
 * Headers to attach to every API request so the backend can validate
 * clock drift and do timezone-aware calculations.
 */
export const timeHeaders = (): Record<string, string> => ({
  'X-User-Time':     currentISOTime(),
  'X-User-Timezone': deviceTimezone(),
});

/**
 * Body fields to include when sending JSON (alternative to headers).
 */
export const timeBody = () => ({
  currentTime: currentISOTime(),
  timezone:    deviceTimezone(),
});

/**
 * Format a UTC ISO string for display in the user's local timezone.
 * e.g. "2026-04-08T03:30:00.000Z" → "08 Apr 2026, 9:00 am"
 */
export const formatInLocalTz = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: deviceTimezone(),
      day: '2-digit', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return isoString;
  }
};

/**
 * Returns true if two ISO timestamps are within `maxDriftMs` of each other.
 * Useful for client-side sanity checks before sending.
 */
export const isWithinDrift = (isoA: string, isoB: string, maxDriftMs = 120_000): boolean => {
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) <= maxDriftMs;
};
