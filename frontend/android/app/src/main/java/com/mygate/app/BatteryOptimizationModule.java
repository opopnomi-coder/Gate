package com.mygate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationManagerCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class BatteryOptimizationModule extends ReactContextBaseJavaModule {

    public BatteryOptimizationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "BatteryOptimization";
    }

    /** Returns true if battery optimization is already disabled (whitelisted) */
    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getReactApplicationContext()
                        .getSystemService(Context.POWER_SERVICE);
                String packageName = getReactApplicationContext().getPackageName();
                promise.resolve(pm.isIgnoringBatteryOptimizations(packageName));
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.resolve(true);
        }
    }

    /** Returns true if the app has notification permission */
    @ReactMethod
    public void areNotificationsEnabled(Promise promise) {
        try {
            boolean enabled = NotificationManagerCompat
                    .from(getReactApplicationContext())
                    .areNotificationsEnabled();
            promise.resolve(enabled);
        } catch (Exception e) {
            promise.resolve(true);
        }
    }

    /**
     * Checks all notification channels — returns true only if ALL are enabled
     * (importance != IMPORTANCE_NONE and not blocked).
     */
    @ReactMethod
    public void areAllChannelsEnabled(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = (NotificationManager) getReactApplicationContext()
                        .getSystemService(Context.NOTIFICATION_SERVICE);
                for (NotificationChannel ch : nm.getNotificationChannels()) {
                    if (ch.getImportance() == NotificationManager.IMPORTANCE_NONE) {
                        promise.resolve(false);
                        return;
                    }
                }
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(true);
        }
    }

    /** Returns device manufacturer in lowercase */
    @ReactMethod
    public void getDeviceBrand(Promise promise) {
        promise.resolve(Build.MANUFACTURER.toLowerCase());
    }

    /**
     * Returns a map of all notification-related settings in one call
     * to minimise bridge round-trips.
     */
    @ReactMethod
    public void getAllNotificationSettings(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            WritableMap result = Arguments.createMap();

            // Battery optimization
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                result.putBoolean("batteryOptimizationDisabled",
                        pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
            } else {
                result.putBoolean("batteryOptimizationDisabled", true);
            }

            // Notification permission
            result.putBoolean("notificationsEnabled",
                    NotificationManagerCompat.from(ctx).areNotificationsEnabled());

            // Channel check
            boolean channelsOk = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = (NotificationManager) ctx
                        .getSystemService(Context.NOTIFICATION_SERVICE);
                for (NotificationChannel ch : nm.getNotificationChannels()) {
                    if (ch.getImportance() == NotificationManager.IMPORTANCE_NONE) {
                        channelsOk = false;
                        break;
                    }
                }
            }
            result.putBoolean("channelsEnabled", channelsOk);

            // Device brand
            result.putString("brand", Build.MANUFACTURER.toLowerCase());

            promise.resolve(result);
        } catch (Exception e) {
            // Fail open — never block the user due to a check error
            WritableMap result = Arguments.createMap();
            result.putBoolean("batteryOptimizationDisabled", true);
            result.putBoolean("notificationsEnabled", true);
            result.putBoolean("channelsEnabled", true);
            result.putString("brand", Build.MANUFACTURER.toLowerCase());
            promise.resolve(result);
        }
    }
}
