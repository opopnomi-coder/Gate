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
import { showLocalNotification } from './localNotification.service';

const PUSH_TOKEN_KEY = '@mygate_push_token';

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
 * Called on login — requests permission, gets FCM token, registers with backend.
 * Skips if the same user+token combo is already stored.
 */
export async function initPushNotifications(userId: string, userType: string): Promise<void> {
  try {
    await requestFCMPermission();
    const token = await getFCMToken();
    if (!token) return;

    // Skip if already registered for this user+token
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (stored === `${userId}:${token}`) return;

    await savePushTokenToBackend(userId, token);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, `${userId}:${token}`);
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
    console.log('✅ FCM token unregistered');
  } catch (error) {
    console.warn('⚠️ Failed to unregister FCM token:', error);
  }
}

/**
 * Set up foreground FCM message handler.
 * When the app is open, FCM doesn't show a notification automatically —
 * we display it via notifee (same as the polling path).
 * The user tapping the notifee banner is handled by onNotificationTap in localNotification.service.
 * Returns an unsubscribe function.
 */
export function setupFCMForegroundHandler(): () => void {
  const unsub = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title || remoteMessage.data?.title as string || 'RIT Gate';
    const body  = remoteMessage.notification?.body  || remoteMessage.data?.body  as string || '';
    const actionRoute = remoteMessage.data?.actionRoute as string | undefined;
    const id = remoteMessage.messageId || String(Date.now());

    // Show via notifee so it appears in the notification shade even in foreground
    await showLocalNotification(id, title, body, {
      actionRoute: actionRoute || '',
      notificationId: id,
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
 * FCM delivers data-only messages in background/killed state via this handler.
 */
export function registerBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // Data-only messages in background: show via notifee
    const title = remoteMessage.data?.title as string || 'RIT Gate';
    const body  = remoteMessage.data?.body  as string || '';
    const actionRoute = remoteMessage.data?.actionRoute as string | undefined;
    const id = remoteMessage.messageId || String(Date.now());

    await showLocalNotification(id, title, body, {
      actionRoute: actionRoute || '',
      notificationId: id,
    });
  });
}
