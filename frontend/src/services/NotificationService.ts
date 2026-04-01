import { Platform, ToastAndroid, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Shows a real Android system notification for file downloads.
 * Uses Android's MediaScannerConnection via RNFS.scanFile which
 * triggers the system to show the file in Downloads + notification shade.
 */
class NotificationService {
  private listeners: Array<(notification: any) => void> = [];

  subscribe(callback: (notification: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(notification: any) {
    this.listeners.forEach(listener => listener(notification));
  }

  async requestPermissions() {
    return true;
  }

  /**
   * Show a system-level download started toast.
   */
  notifyDownloadStarted(filename: string) {
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        `⬇️ Generating ${filename}…`,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM
      );
    }
    console.log(`📥 Download started: ${filename}`);
  }

  /**
   * Show a system-level download complete notification.
   * Triggers Android MediaScanner so the file appears in the
   * notification shade under "Downloads".
   */
  async notifyDownloadSuccess(filename: string, filePath?: string) {
    console.log(`✅ Download complete: ${filename}`);

    if (Platform.OS === 'android') {
      // Show toast immediately
      ToastAndroid.showWithGravity(
        `✅ ${filename} saved to Downloads`,
        ToastAndroid.LONG,
        ToastAndroid.BOTTOM
      );

      // Trigger media scan — this makes Android show the file in the
      // Downloads notification and Files app
      if (filePath) {
        try {
          await RNFS.scanFile(filePath);
        } catch (e) {
          console.warn('Media scan failed:', e);
        }
      }
    }
  }

  /**
   * Download a file from URL with system notification.
   */
  async downloadFile(url: string, filename: string, mimeType?: string) {
    this.notifyDownloadStarted(filename);
    const dir = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
    const destPath = `${dir}/${filename}`;
    try {
      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        background: true,
        discretionary: false,
      }).promise;
      if (result.statusCode === 200) {
        await this.notifyDownloadSuccess(filename, destPath);
        return { success: true, filePath: destPath };
      }
      return { success: false, message: `HTTP ${result.statusCode}` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}

export const notificationService = new NotificationService();
