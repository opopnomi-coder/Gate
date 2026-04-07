package com.mygate.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager

/**
 * NotificationWakeReceiver
 *
 * Acquires a brief WAKE_LOCK when an FCM notification arrives so the screen
 * turns on even on aggressive OEM devices (OPPO/Vivo/Xiaomi) that suppress
 * fullScreenIntent wake behavior.
 *
 * Registered in AndroidManifest.xml for com.google.android.c2dm.intent.RECEIVE.
 */
class NotificationWakeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            // Acquire a full wake lock for 3 seconds — enough to show the notification
            @Suppress("DEPRECATION")
            val wl = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "ritgate:NotificationWake"
            )
            wl.acquire(3000L) // auto-release after 3s
        } catch (e: Exception) {
            // Never crash — wake is best-effort
        }
    }
}
