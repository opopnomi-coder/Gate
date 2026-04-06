/**
 * Requests battery optimization exemption on Android.
 * Also handles OPPO/OnePlus/Xiaomi vendor-specific battery restrictions.
 */
import { Platform, NativeModules, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASKED_KEY = '@battery_opt_asked';

export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');

    // Step 1: Request standard Android battery optimization exemption
    try {
      await Linking.sendIntent('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: 'com.mygate.app' },
      ]);
    } catch {
      // Already whitelisted or not supported — continue
    }

    // Step 2: On OPPO/OnePlus/Realme devices, show a guide to enable Auto Launch
    // These devices kill background apps aggressively beyond standard Android doze
    const brand = (NativeModules?.PlatformConstants?.Brand || '').toLowerCase();
    const isAggressiveOEM = ['oppo', 'oneplus', 'realme', 'xiaomi', 'redmi', 'vivo', 'huawei', 'honor'].some(b => brand.includes(b));

    if (isAggressiveOEM) {
      Alert.alert(
        'Enable Background Notifications',
        'To receive notifications when the app is closed, please:\n\n1. Go to Settings → Apps → RIT Gate\n2. Enable "Auto Launch" or "Allow background activity"\n3. Set Battery to "No restrictions"',
        [
          {
            text: 'Open Settings',
            onPress: () => {
              // Try to open app-specific battery settings
              Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [
                { key: 'android.provider.extra.APP_PACKAGE', value: 'com.mygate.app' },
              ]).catch(() => Linking.openSettings());
            },
          },
          { text: 'Later', style: 'cancel' },
        ]
      );
    }
  } catch {
    // ignore
  }
}
