import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { exportStyledPdfReport } from '../utils/pdfReport';

const DOWNLOAD_CHANNEL_ID = 'ritgate_downloads';
let downloadChannelCreated = false;

async function ensureDownloadChannel() {
  if (downloadChannelCreated) return;
  await notifee.createChannel({
    id: DOWNLOAD_CHANNEL_ID,
    name: 'Downloads',
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PUBLIC,
    vibration: false,
    sound: 'default',
  });
  downloadChannelCreated = true;
}

/**
 * NotificationService — handles PDF report generation with progress notification.
 * Shows "Generating…" notification, then a tappable "Download Complete" notification
 * that opens the file when tapped.
 */
class NotificationService {
  private listeners: Array<(notification: any) => void> = [];

  subscribe(callback: (notification: any) => void) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  notify(notification: any) {
    this.listeners.forEach(listener => listener(notification));
  }

  async requestPermissions() { return true; }

  /**
   * Generate a PDF report with a progress notification.
   * Shows indeterminate progress while generating, then a tappable complete notification.
   */
  async generatePdfReport(params: Parameters<typeof exportStyledPdfReport>[0]): Promise<{ success: boolean; filePath?: string; message?: string }> {
    await ensureDownloadChannel();
    const notifId = `dl-${Date.now()}`;
    const filename = (params.filename || params.title || 'report').replace(/[^a-z0-9-_]/gi, '_') + '.pdf';

    // Show "Generating…" with indeterminate progress bar
    await notifee.displayNotification({
      id: notifId,
      title: 'Generating Report…',
      body: filename,
      android: {
        channelId: DOWNLOAD_CHANNEL_ID,
        smallIcon: 'notification_icon',
        ongoing: true,
        onlyAlertOnce: true,
        progress: { max: 100, current: 0, indeterminate: true },
        pressAction: { id: 'default' },
      },
    });

    try {
      const filePath = await exportStyledPdfReport(params);

      if (!filePath) {
        await notifee.cancelNotification(notifId);
        return { success: false, message: 'PDF generation failed' };
      }

      // Scan so it appears in Files app
      if (Platform.OS === 'android') {
        try { await RNFS.scanFile(filePath); } catch {}
      }

      // Replace with tappable "Download Complete" notification
      await notifee.displayNotification({
        id: notifId,
        title: '✅ Report Ready',
        body: `${filename} — tap to open`,
        data: { filePath, mimeType: 'application/pdf', type: 'download' },
        android: {
          channelId: DOWNLOAD_CHANNEL_ID,
          smallIcon: 'notification_icon',
          importance: AndroidImportance.HIGH,
          ongoing: false,
          onlyAlertOnce: false,
          pressAction: { id: 'open-file', launchActivity: 'default' },
          actions: [
            { title: 'Open', pressAction: { id: 'open-file', launchActivity: 'default' } },
          ],
        },
      });

      return { success: true, filePath };
    } catch (e: any) {
      await notifee.cancelNotification(notifId);
      return { success: false, message: e.message };
    }
  }

  // Legacy stubs — kept so existing call sites don't break
  notifyDownloadStarted(_filename: string) {}
  async notifyDownloadSuccess(_filename: string, _filePath?: string) {}

  /** Legacy URL-based download (kept for non-PDF downloads) */
  async downloadFile(url: string, filename: string, mimeType?: string): Promise<{ success: boolean; filePath?: string; message?: string }> {
    await ensureDownloadChannel();
    const notifId = `dl-${Date.now()}`;
    const dir = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
    const destPath = `${dir}/${filename}`;

    await notifee.displayNotification({
      id: notifId,
      title: 'Downloading…',
      body: filename,
      android: {
        channelId: DOWNLOAD_CHANNEL_ID,
        smallIcon: 'notification_icon',
        ongoing: true,
        onlyAlertOnce: true,
        progress: { max: 100, current: 0, indeterminate: true },
        pressAction: { id: 'default' },
      },
    });

    try {
      let lastProgress = 0;
      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        background: true,
        discretionary: false,
        progress: async (res) => {
          const pct = Math.floor((res.bytesWritten / res.contentLength) * 100);
          if (pct !== lastProgress && pct % 10 === 0) {
            lastProgress = pct;
            await notifee.displayNotification({
              id: notifId,
              title: `Downloading… ${pct}%`,
              body: filename,
              android: {
                channelId: DOWNLOAD_CHANNEL_ID,
                smallIcon: 'notification_icon',
                ongoing: true,
                onlyAlertOnce: true,
                progress: { max: 100, current: pct, indeterminate: false },
                pressAction: { id: 'default' },
              },
            });
          }
        },
        progressDivider: 1,
      }).promise;

      if (result.statusCode === 200) {
        if (Platform.OS === 'android') {
          try { await RNFS.scanFile(destPath); } catch {}
        }
        const fileMime = mimeType || getMimeType(filename);
        await notifee.displayNotification({
          id: notifId,
          title: '✅ Download Complete',
          body: `${filename} — tap to open`,
          data: { filePath: destPath, mimeType: fileMime, type: 'download' },
          android: {
            channelId: DOWNLOAD_CHANNEL_ID,
            smallIcon: 'notification_icon',
            importance: AndroidImportance.HIGH,
            ongoing: false,
            pressAction: { id: 'open-file', launchActivity: 'default' },
            actions: [
              { title: 'Open', pressAction: { id: 'open-file', launchActivity: 'default' } },
            ],
          },
        });
        return { success: true, filePath: destPath };
      } else {
        await notifee.cancelNotification(notifId);
        return { success: false, message: `HTTP ${result.statusCode}` };
      }
    } catch (e: any) {
      await notifee.cancelNotification(notifId);
      return { success: false, message: e.message };
    }
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'csv') return 'text/csv';
  return 'application/octet-stream';
}

export const notificationService = new NotificationService();
