/**
 * pushNotification.service.ts
 *
 * FCM token registration + notification tap handling.
 * Uses @react-native-firebase/messaging to get the device FCM token,
 * registers it with the backend, and wires up foreground/background handlers.
 *
 * The backend PushNotificationService sends FCM messages via the HTTP v1 API.
 * This file handles the CLIENT side only — no duplicate notification logic.
 */
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { showLocalNotification, ensureChannel } from './localNotification.service';

const PUSH_TOKEN_KEY = '@mygate_push_token';
const SHOWN_IDS_KEY = '@ritgate_shown_notif_ids';

// ── Shared deduplication helpers ──────────────────────────────────────────────
// These mirror the same AsyncStorage key used by NotificationContext so that
// FCM-delivered notifications are tracked in the same set, preventing the
// polling path from re-showing them as banners.

async function addToShownIds(id: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SHOWN_IDS_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(id)) {
      arr.push(id);
      // Keep only the last 300 to avoid unbounded growth
      const trimmed = arr.slice(-300);
      await AsyncStorage.setItem(SHOWN_IDS_KEY, JSON.stringify(trimmed));
    }
  } catch {}
}

/** Request FCM permission (iOS requires explicit prompt; Android 13+ also needs it). */
export async function requestFCMPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/** Get the FCM token for this device. Returns null on failure. */
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token || null;
  } catch (e) {
    console.warn('⚠️ Failed to get FCM token:', e);
    return null;
  }
}

/**
 * Called on login / app restore — requests permission, gets FCM token, registers with backend.
 * - First login or new token: registers and stores userId:token
 * - Same session (token unchanged, already registered this session): skips
 * - Logout: token is removed via unregisterPushToken()
 *
 * Uses a session-level in-memory flag to avoid re-registering on every poll/render,
 * but always re-registers on fresh app launch (process restart clears the flag).
 */
const _registeredThisSession = new Set<string>();

export async function initPushNotifications(userId: string, userType: string): Promise<void> {
  try {
    await ensureChannel();
    await requestFCMPermission();
    const token = await getFCMToken();
    if (!token) return;

    const sessionKey = `${userId}:${token}`;

    // Skip if already registered in this process lifetime
    if (_registeredThisSession.has(sessionKey)) return;

    await savePushTokenToBackend(userId, token);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, sessionKey);
    _registeredThisSession.add(sessionKey);
    console.log('✅ FCM token registered for', userId);
  } catch (error) {
    console.warn('⚠️ Push init failed:', error);
  }
}

/** POST the FCM token to the backend. */
export async function savePushTokenToBackend(userId: string, token: string): Promise<void> {
  try {
    const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    const res = await fetch(`${API_CONFIG.BASE_URL}/notifications/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pushToken: token, deviceType }),
    });
    const data = await res.json();
    if (data.success) console.log('✅ FCM token saved to backend');
    else console.warn('⚠️ Backend rejected push token:', data.message);
  } catch (error) {
    console.warn('⚠️ Failed to save FCM token to backend:', error);
  }
}

/** DELETE the FCM token from backend on logout. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!stored) return;
    const pushToken = stored.substring(stored.indexOf(':') + 1);

    await fetch(`${API_CONFIG.BASE_URL}/notifications/push-token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    // Clear session cache so next login re-registers
    _registeredThisSession.clear();
    console.log('✅ FCM token unregistered');
  } catch (error) {
    console.warn('⚠️ Failed to unregister FCM token:', error);
  }
}

/**
 * Set up foreground FCM message handler.
 * When the app is open, FCM doesn't show a notification automatically —
 * we display it via notifee (same as the polling path).
 *
 * Critically: we use the backend DB notification ID (passed in data.notificationId)
 * as the notifee notification tag AND persist it to the shared shown-ids set.
 * This prevents the polling path from re-showing the same notification.
 */
export function setupFCMForegroundHandler(): () => void {
  const unsub = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title || remoteMessage.data?.title as string || 'RIT Gate';
    const body  = remoteMessage.notification?.body  || remoteMessage.data?.body  as string || '';
    const actionRoute = remoteMessage.data?.actionRoute as string | undefined;
    const dbNotifId = remoteMessage.data?.notificationId as string | undefined;

    // Use the DB notification ID if available; fall back to FCM messageId
    const displayId = dbNotifId || remoteMessage.messageId || String(Date.now());

    // Track this notification in the shared shown set so polling won't re-show it
    if (dbNotifId) {
      const numericId = parseInt(dbNotifId, 10);
      if (!isNaN(numericId)) {
        await addToShownIds(numericId);
        // Send delivery receipt (Feature 3)
        sendDeliveryReceipt(numericId).catch(() => {});
      }
    }

    // Show via notifee so it appears in the notification shade even in foreground
    await showLocalNotification(displayId, title, body, {
      actionRoute: actionRoute || '',
      notificationId: displayId,
    });
  });
  return unsub;
}

/**
 * Register a handler for notification tap events (background → foreground).
 * Called when user taps a notification while app is in background.
 * Returns an unsubscribe function.
 */
export function setupNotificationTapHandler(
  onNavigate: (route: string) => void
): () => void {
  // Background tap (app was in background, now comes to foreground)
  const unsub = messaging().onNotificationOpenedApp((remoteMessage) => {
    const route = remoteMessage.data?.actionRoute as string | undefined;
    if (route) onNavigate(route);
  });
  return unsub;
}

/**
 * Handle notification that opened the app from KILLED state.
 * Must be called once on app mount.
 */
export async function handleInitialNotification(
  onNavigate: (route: string) => void
): Promise<void> {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage?.data?.actionRoute) {
      onNavigate(remoteMessage.data.actionRoute as string);
    }
  } catch {}
}

/**
 * Register background message handler (must be called outside React tree, in index.js).
 * FCM delivers messages in background/killed state via this handler.
 * 
 * NOTE: We do NOT call showLocalNotification here because the FCM payload includes
 * a "notification" field which Android displays natively in background/killed state.
 * Calling showLocalNotification here would cause a duplicate.
 * The only job of this handler is to track the notification ID in shown-ids so the
 * polling path doesn't re-show it when the app resumes.
 */
export function registerBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const dbNotifId = remoteMessage.data?.notificationId as string | undefined;

    // Track in shared shown set so polling won't re-show as a banner
    if (dbNotifId) {
      const numericId = parseInt(dbNotifId, 10);
      if (!isNaN(numericId)) {
        await addToShownIds(numericId);
        // Send delivery receipt to backend
        sendDeliveryReceipt(numericId).catch(() => {});
      }
    }
    // FCM notification field handles the OS banner natively — no notifee call needed
  });
}

/**
 * Send a delivery receipt to the backend confirming the notification was received.
 * This lets the backend know FCM delivery succeeded (Feature 3).
 */
export async function sendDeliveryReceipt(notificationId: number): Promise<void> {
  try {
    await fetch(`${API_CONFIG.BASE_URL}/notifications/${notificationId}/delivered`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Non-critical — fire and forget
  }
}

/**
 * Update the app icon badge count (Feature 5).
 * Uses notifee's setBadgeCount for Android/iOS.
 */
export async function updateBadgeCount(count: number): Promise<void> {
  try {
    const notifee = require('@notifee/react-native').default;
    await notifee.setBadgeCount(count);
  } catch {
    // notifee may not support badges on all devices
  }
}

/**
 * Clear the app icon badge (call on app foreground or all-read).
 */
export async function clearBadge(): Promise<void> {
  await updateBadgeCount(0);
}
