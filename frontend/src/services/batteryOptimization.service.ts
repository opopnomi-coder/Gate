/**
 * batteryOptimization.service.ts
 *
 * Checks all settings required for reliable push notification delivery:
 *   1. Battery optimization disabled (hard-checkable via PowerManager)
 *   2. Notification permission granted (hard-checkable via NotificationManagerCompat)
 *   3. Notification channels not blocked (hard-checkable via NotificationManager)
 *   4. OEM-specific background/autostart (not checkable — manual confirm required)
 */
import { NativeModules, Platform, Linking } from 'react-native';

const { BatteryOptimization } = NativeModules;
const APP_PACKAGE = 'com.mygate.app';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationSettings {
  batteryOptimizationDisabled: boolean;
  notificationsEnabled: boolean;
  channelsEnabled: boolean;
  brand: string;
}

export interface SettingItem {
  key: keyof NotificationSettings | 'oemAutoStart';
  label: string;
  description: string;
  isOk: boolean;
  canAutoCheck: boolean; // false = OEM-only, user must confirm manually
}

export interface BrandGuide {
  displayName: string;
  isAggressiveOEM: boolean;
  steps: {
    batteryOptimization: string[];
    notifications: string[];
    oemAutoStart?: string[];
  };
  notes?: string;
}

// ─── Native bridge ────────────────────────────────────────────────────────────

export async function getAllNotificationSettings(): Promise<NotificationSettings> {
  if (Platform.OS !== 'android') {
    return { batteryOptimizationDisabled: true, notificationsEnabled: true, channelsEnabled: true, brand: '' };
  }
  try {
    return await BatteryOptimization.getAllNotificationSettings();
  } catch {
    return { batteryOptimizationDisabled: true, notificationsEnabled: true, channelsEnabled: true, brand: '' };
  }
}

// ─── Settings deep-links ──────────────────────────────────────────────────────

export async function openBatteryOptimizationSettings(): Promise<void> {
  try {
    await Linking.sendIntent('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: APP_PACKAGE },
    ]);
  } catch {
    await openAppSettings();
  }
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: APP_PACKAGE },
    ]);
  } catch {
    await openAppSettings();
  }
}

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: APP_PACKAGE },
    ]);
  } catch {
    await Linking.openSettings();
  }
}

// OEM-specific autostart/background deep-links
export async function openOEMAutoStartSettings(brand: string): Promise<void> {
  const b = brand.toLowerCase();
  const intents: Array<{ pkg: string; activity: string }> = [];

  if (['xiaomi', 'redmi', 'poco'].some(x => b.includes(x))) {
    intents.push({ pkg: 'com.miui.securitycenter', activity: 'com.miui.permcenter.autostart.AutoStartManagementActivity' });
  } else if (b.includes('vivo')) {
    intents.push({ pkg: 'com.vivo.permissionmanager', activity: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity' });
  } else if (['oppo', 'realme'].some(x => b.includes(x))) {
    intents.push({ pkg: 'com.coloros.safecenter', activity: 'com.coloros.privacypermissionsentry.PermissionTopActivity' });
    intents.push({ pkg: 'com.oplus.safecenter', activity: 'com.coloros.privacypermissionsentry.PermissionTopActivity' });
  } else if (b.includes('oneplus')) {
    intents.push({ pkg: 'com.oneplus.security', activity: 'com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity' });
  } else if (['huawei', 'honor'].some(x => b.includes(x))) {
    intents.push({ pkg: 'com.huawei.systemmanager', activity: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity' });
  } else if (b.includes('samsung')) {
    intents.push({ pkg: 'com.samsung.android.lool', activity: 'com.samsung.android.sm.battery.ui.BatteryActivity' });
  } else if (b.includes('asus')) {
    intents.push({ pkg: 'com.asus.mobilemanager', activity: 'com.asus.mobilemanager.autostart.AutoStartActivity' });
  }

  for (const intent of intents) {
    try {
      await Linking.openURL(`intent://#Intent;component=${intent.pkg}/${intent.activity};end`);
      return;
    } catch {}
  }
  // Fallback
  await openAppSettings();
}

// ─── Brand-specific guides ────────────────────────────────────────────────────

export function isAggressiveOEM(brand: string): boolean {
  const b = brand.toLowerCase();
  return ['xiaomi', 'redmi', 'poco', 'vivo', 'oppo', 'oneplus', 'realme',
    'huawei', 'honor', 'asus', 'meizu', 'lenovo', 'samsung'].some(x => b.includes(x));
}

export function getBrandGuide(brand: string): BrandGuide {
  const b = brand.toLowerCase();

  if (['xiaomi', 'redmi', 'poco'].some(x => b.includes(x))) {
    return {
      displayName: 'Xiaomi / Redmi / POCO (MIUI)',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'The system dialog will appear — tap "Allow"',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Make sure the toggle at the top is ON',
          'Ensure all channels listed below are enabled',
        ],
        oemAutoStart: [
          'Tap "Open AutoStart Settings"',
          'Find RIT Gate in the list',
          'Toggle it ON',
          'Go back and tap "I\'ve done it"',
        ],
      },
      notes: 'MIUI kills background apps aggressively. AutoStart is required for notifications when the app is closed.',
    };
  }

  if (b.includes('samsung')) {
    return {
      displayName: 'Samsung (One UI)',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'Tap "Allow" on the system dialog',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Enable the main toggle',
          'Make sure all channels are ON',
        ],
        oemAutoStart: [
          'Tap "Open Battery Settings"',
          'Go to Background usage limits',
          'If RIT Gate appears under "Sleeping apps" — swipe it left and tap Remove',
          'Tap "I\'ve done it" when done',
        ],
      },
      notes: 'Samsung One UI automatically moves inactive apps to "sleeping" mode. Check this after every OS update.',
    };
  }

  if (b.includes('vivo')) {
    return {
      displayName: 'Vivo',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'Tap "Allow" on the system dialog',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Enable notifications for RIT Gate',
        ],
        oemAutoStart: [
          'Tap "Open Background Settings"',
          'Find RIT Gate → enable "Allow background activity"',
          'Also enable "Auto-start"',
          'Tap "I\'ve done it" when done',
        ],
      },
    };
  }

  if (['oppo', 'realme'].some(x => b.includes(x))) {
    return {
      displayName: b.includes('realme') ? 'Realme' : 'OPPO',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'Tap "Allow" on the system dialog',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Enable notifications for RIT Gate',
        ],
        oemAutoStart: [
          'Tap "Open Startup Manager"',
          'Find RIT Gate → enable "Allow auto-launch"',
          'Also enable "Allow background activity"',
          'Tap "I\'ve done it" when done',
        ],
      },
    };
  }

  if (b.includes('oneplus')) {
    return {
      displayName: 'OnePlus',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'Tap "Allow" on the system dialog',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Enable notifications for RIT Gate',
        ],
        oemAutoStart: [
          'Tap "Open Battery Settings"',
          'Go to Battery Optimization → find RIT Gate',
          'Select "Don\'t optimize"',
          'Tap "I\'ve done it" when done',
        ],
      },
    };
  }

  if (['huawei', 'honor'].some(x => b.includes(x))) {
    return {
      displayName: b.includes('honor') ? 'Honor' : 'Huawei',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'Tap "Allow" on the system dialog',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Enable notifications for RIT Gate',
        ],
        oemAutoStart: [
          'Tap "Open Protected Apps"',
          'Find RIT Gate and enable it',
          'Also go to Settings → Apps → RIT Gate → Battery → enable "Run in background"',
          'Tap "I\'ve done it" when done',
        ],
      },
      notes: 'Huawei EMUI is the most restrictive. All three steps are required.',
    };
  }

  if (b.includes('asus')) {
    return {
      displayName: 'ASUS',
      isAggressiveOEM: true,
      steps: {
        batteryOptimization: [
          'Tap "Fix" next to Battery Optimization',
          'Tap "Allow" on the system dialog',
        ],
        notifications: [
          'Tap "Fix" next to Notifications',
          'Enable notifications for RIT Gate',
        ],
        oemAutoStart: [
          'Tap "Open Auto-start Settings"',
          'Find RIT Gate and enable it',
          'Tap "I\'ve done it" when done',
        ],
      },
    };
  }

  // Generic Android
  return {
    displayName: 'Android',
    isAggressiveOEM: false,
    steps: {
      batteryOptimization: [
        'Tap "Fix" next to Battery Optimization',
        'Tap "Allow" on the system dialog',
      ],
      notifications: [
        'Tap "Fix" next to Notifications',
        'Enable notifications for RIT Gate',
      ],
    },
  };
}
