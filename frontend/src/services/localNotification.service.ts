/**
 * localNotification.service.ts
 *
 * Wraps @notifee/react-native to show real Android OS notifications.
 * Called by NotificationContext whenever new unread notifications arrive.
 */
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';

const CHANNEL_ID = 'ritgate_main';
const CHANNEL_NAME = 'RIT Gate Notifications';

let channelCreated = false;

/** Create the notification channel once (Android 8+). */
async function ensureChannel() {
  if (channelCreated) return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    sound: 'default',
  });
  channelCreated = true;
}

/** Request POST_NOTIFICATIONS permission (Android 13+). */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
  } catch {
    return false;
  }
}

/** Display a single OS notification. */
export async function showLocalNotification(
  id: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    await ensureChannel();
    await notifee.displayNotification({
      id,
      title,
      body,
      data,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'notification_icon', // exists in drawable-* folders
        pressAction: { id: 'default' },
        showTimestamp: true,
      },
    });
  } catch (e) {
    console.warn('localNotification: failed to show notification', e);
  }
}

/** Cancel a specific notification by id. */
export async function cancelNotification(id: string): Promise<void> {
  try {
    await notifee.cancelNotification(id);
  } catch {}
}

/** Cancel all displayed notifications. */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
  } catch {}
}

/**
 * Register a handler for notification tap events.
 * Returns an unsubscribe function.
 */
export function onNotificationTap(
  handler: (data: Record<string, string>) => void
): () => void {
  const unsub = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
      const data = (detail.notification?.data || {}) as Record<string, string>;

      // Download notification — open the file
      if (data.type === 'download' && data.filePath) {
        openFile(data.filePath, data.mimeType || 'application/pdf');
        return;
      }

      // App notification — navigate
      if (data.actionRoute) {
        handler(data);
      }
    }
  });
  return unsub;
}

/** Open a file using Android's file viewer intent */
async function openFile(filePath: string, mimeType: string): Promise<void> {
  try {
    const { Linking } = require('react-native');
    // Try opening via Linking — works for content:// and file:// URIs
    const uri = `file://${filePath}`;
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    } else {
      // Fallback: open Downloads folder
      await Linking.openURL('content://com.android.externalstorage.documents/root/primary');
    }
  } catch (e) {
    console.warn('Could not open file:', e);
  }
}

/**
 * Handle notification that opened the app from background/quit state.
 */
export async function getInitialNotificationData(): Promise<Record<string, string> | null> {
  try {
    const initial = await notifee.getInitialNotification();
    if (initial?.notification?.data) {
      return initial.notification.data as Record<string, string>;
    }
  } catch {}
  return null;
}
