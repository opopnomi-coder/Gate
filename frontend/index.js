import { AppRegistry } from 'react-native';
import React from 'react';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';
import notifee, { EventType } from '@notifee/react-native';

// Background event handler — required by notifee for background/quit state
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    // Notification was tapped while app was in background/quit
    // The app will open and getInitialNotificationData() will handle navigation
    console.log('Notification tapped in background:', detail.notification?.id);
  }
  if (type === EventType.DISMISSED) {
    // User dismissed the notification — nothing to do
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
