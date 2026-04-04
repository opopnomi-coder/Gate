import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { showLocalNotification } from './localNotification.service';

/**
 * NotificationService — handles file download notifications.
 * Uses notifee for real OS notifications (appears in notification shade
 * even when app is in background/foreground).
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

  /** Show a real OS notification that download has started. */
  notifyDownloadStarted(filename: string) {
    showLocalNotification(
      `download-start-${Date.now()}`,
      'Download Started',
      `Generating ${filename}…`,
    );
    console.log(`📥 Download started: ${filename}`);
  }

  /** Show a real OS notification that download completed. */
  async notifyDownloadSuccess(filename: string, filePath?: string) {
    console.log(`✅ Download complete: ${filename}`);

    // Show OS notification — appears in notification shade
    await showLocalNotification(
      `download-done-${Date.now()}`,
      'Download Complete',
      `${filename} saved to Downloads`,
    );

    // Trigger media scan so file appears in Files app
    if (Platform.OS === 'android' && filePath) {
      try {
        await RNFS.scanFile(filePath);
      } catch (e) {
        console.warn('Media scan failed:', e);
      }
    }
  }

  /** Download a file from URL with OS notifications. */
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
