import { AppRegistry } from 'react-native';
import React from 'react';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';
import notifee, { EventType } from '@notifee/react-native';
import { registerBackgroundHandler } from './src/services/pushNotification.service';

// ── FCM background handler (must be registered before AppRegistry) ──────────
registerBackgroundHandler();

// ── Notifee background handler ───────────────────────────────────────────────
// When the app is in the background and the user taps a notifee notification,
// store the actionRoute so getInitialNotificationData() picks it up on resume.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    const route = detail.notification?.data?.actionRoute;
    console.log('Notifee background tap — route:', route);
    // No extra action needed: notifee.getInitialNotification() will return this
    // notification when the app comes to foreground, and App.tsx reads it.
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
