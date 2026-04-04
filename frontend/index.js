import { AppRegistry, Linking } from 'react-native';
import React from 'react';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';
import notifee, { EventType } from '@notifee/react-native';
import { registerBackgroundHandler } from './src/services/pushNotification.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── FCM background handler (must be registered before AppRegistry) ──────────
registerBackgroundHandler();

// ── Notifee background handler ───────────────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const data = detail.notification?.data || {};

  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    // Download notification — open Downloads folder
    if (data.type === 'download') {
      try {
        await Linking.openURL('content://com.android.externalstorage.documents/root/primary:Download');
      } catch {
        try { await Linking.openURL('content://downloads/public_downloads'); } catch {}
      }
      return;
    }

    // App notification — store actionRoute so App.tsx applies it on resume
    if (data.actionRoute) {
      await AsyncStorage.setItem('@pending_notification_route', data.actionRoute);
    }
  }
});

function Root() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

AppRegistry.registerComponent('main', () => Root);
