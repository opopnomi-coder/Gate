/**
 * notificationOnboarding.ts
 *
 * Handles OEM-specific battery optimization and auto-launch settings
 * to maximize FCM push notification delivery in killed state.
 *
 * Supported OEMs: Xiaomi/Redmi, Vivo, OPPO/OnePlus/Realme, Huawei/Honor, Samsung
 * Standard Android: ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 */
import { Platform, NativeModules, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_DONE_KEY = '@ritgate_notif_onboarding_done';
const DELAY_DETECTED_KEY = '@ritgate_notif_delay_detected';

// ── Device info ──────────────────────────────────────────────────────────────

function getDeviceBrand(): string {
  return (
    NativeModules?.PlatformConstants?.Brand ||
    NativeModules?.PlatformConstants?.Manufacturer ||
    ''
  ).toLowerCase();
}

function getDeviceManufacturer(): string {
  return (NativeModules?.PlatformConstants?.Manufacturer || '').toLowerCase();
}

export function isAggressiveOEM(): boolean {
  const brand = getDeviceBrand();
  const mfr = getDeviceManufacturer();
  const combined = `${brand} ${mfr}`;
  return ['xiaomi', 'redmi', 'poco', 'vivo', 'oppo', 'oneplus', 'realme',
    'huawei', 'honor', 'meizu', 'asus', 'lenovo'].some(b => combined.includes(b));
}

// ── OEM-specific intent map ───────────────────────────────────────────────────

interface OEMIntent {
  package: string;
  activity: string;
  label: string;
}

/**
 * Returns the best-known OEM intent for auto-launch / background settings.
 * Each entry has been verified against real devices.
 * Falls back to null if brand not matched.
 */
function getOEMIntent(): OEMIntent | null {
  const brand = getDeviceBrand();

  // Xiaomi / Redmi / POCO — MIUI AutoStart
  if (['xiaomi', 'redmi', 'poco'].some(b => brand.includes(b))) {
    return {
      package: 'com.miui.securitycenter',
      activity: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      label: 'MIUI AutoStart',
    };
  }

  // Vivo — iManager background app management
  if (brand.includes('vivo')) {
    return {
      package: 'com.vivo.permissionmanager',
      activity: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity',
      label: 'Vivo Background App Refresh',
    };
  }

  // OPPO / OnePlus / Realme — Startup Manager
  if (['oppo', 'oneplus', 'realme'].some(b => brand.includes(b))) {
    return {
      package: 'com.coloros.safecenter',
      activity: 'com.coloros.privacypermissionsentry.PermissionTopActivity',
      label: 'OPPO Startup Manager',
    };
  }

  // Huawei / Honor — Protected Apps
  if (['huawei', 'honor'].some(b => brand.includes(b))) {
    return {
      package: 'com.huawei.systemmanager',
      activity: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity',
      label: 'Huawei Protected Apps',
    };
  }

  // Samsung — Device Care / Battery
  if (brand.includes('samsung')) {
    return {
      package: 'com.samsung.android.lool',
      activity: 'com.samsung.android.sm.battery.ui.BatteryActivity',
      label: 'Samsung Device Care',
    };
  }

  return null;
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Try to open the OEM-specific auto-launch/background settings screen.
 * Falls back to app details settings if the OEM intent isn't available.
 */
export async function openOEMSettings(): Promise<void> {
  const oemIntent = getOEMIntent();

  if (oemIntent) {
    try {
      await Linking.sendIntent('android.intent.action.MAIN', [
        { key: 'android.intent.extra.PACKAGE_NAME', value: 'com.mygate.app' },
      ]);
      // Try direct activity launch
      await Linking.openURL(
        `intent://#Intent;component=${oemIntent.package}/${oemIntent.activity};end`
      );
      return;
    } catch {
      // OEM activity not found — fall through to app details
    }
  }

  // Fallback: open app battery settings (works on all Android 6+)
  try {
    await Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: 'com.mygate.app' },
    ]);
  } catch {
    await Linking.openSettings();
  }
}

/**
 * Request standard Android battery optimization exemption.
 * Shows the system dialog: "Keep [app] unrestricted?"
 */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  try {
    await Linking.sendIntent(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      [{ key: 'android.provider.extra.APP_PACKAGE', value: 'com.mygate.app' }]
    );
  } catch {
    // Already whitelisted or permission not declared — ignore
  }
}

/**
 * Full onboarding flow — called once on first login.
 * 1. Requests standard battery optimization exemption
 * 2. On aggressive OEMs, shows a non-intrusive prompt to open OEM settings
 */
export async function runNotificationOnboarding(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
    if (done) return;
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');

    // Step 1: Standard Android battery optimization exemption
    await requestIgnoreBatteryOptimizations();

    // Step 2: OEM-specific prompt (non-blocking)
    if (isAggressiveOEM()) {
      const brand = getDeviceBrand();
      const oemIntent = getOEMIntent();
      const settingsLabel = oemIntent?.label || 'Background Settings';

      // Small delay so it doesn't overlap with the battery dialog
      await new Promise(r => setTimeout(r, 1500));

      Alert.alert(
        '🔔 Enable Instant Notifications',
        `Your device (${brand.toUpperCase()}) may delay or block notifications when the app is closed.\n\nTo fix this, enable "Auto Launch" or "Allow background activity" for RIT Gate.`,
        [
          {
            text: 'Fix Now',
            onPress: openOEMSettings,
          },
          { text: 'Later', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  } catch {
    // Never crash the app for notification setup
  }
}

/**
 * Secondary prompt — shown if a notification delay is detected.
 * Call this when you detect a notification arrived late.
 */
export async function showDelayDetectedPrompt(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!isAggressiveOEM()) return;

  try {
    const shown = await AsyncStorage.getItem(DELAY_DETECTED_KEY);
    if (shown) return;
    await AsyncStorage.setItem(DELAY_DETECTED_KEY, '1');

    Alert.alert(
      '⚠️ Notification Delay Detected',
      'Some notifications may be arriving late because your device is restricting background activity.\n\nTap "Fix Now" to open the settings.',
      [
        { text: 'Fix Now', onPress: openOEMSettings },
        { text: 'Dismiss', style: 'cancel' },
      ]
    );
  } catch {}
}

/**
 * Log device info for debugging notification delivery issues.
 */
export function logDeviceNotificationInfo(): void {
  const brand = getDeviceBrand();
  const mfr = getDeviceManufacturer();
  const oemIntent = getOEMIntent();
  console.log(`📱 Device: brand=${brand} mfr=${mfr}`);
  console.log(`🔋 Aggressive OEM: ${isAggressiveOEM()}`);
  console.log(`🎯 OEM Intent: ${oemIntent ? oemIntent.label : 'none (standard Android)'}`);
}
