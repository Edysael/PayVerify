package com.legaltechit.payverify.sms

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Reads notifications posted by the bank apps the merchant authorized.
 * The user must grant "Notification access" to PayVerify in Android settings.
 *
 * Identifier used everywhere (rules, server, parser): "app:<package name>".
 * Privacy: message text is parsed in memory and discarded. For apps that are NOT
 * authorized yet, only the package name is remembered (never any text), and only
 * when the notification looks like a money message. The screen uses that list so
 * the merchant can authorize the right bank app with one tap.
 */
class PaymentNotificationListener : NotificationListenerService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val n = sbn ?: return
        if (n.packageName == packageName) return
        if (n.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        val extras = n.notification.extras ?: return
        val text = listOfNotNull(
            extras.getCharSequence(Notification.EXTRA_TITLE),
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT)
        ).joinToString(" ") { it.toString() }
        if (text.isBlank()) return

        val sourceId = notificationSourceId(n.packageName)
        val prefs = applicationContext.getSharedPreferences("payverify", MODE_PRIVATE)
        val allowed = prefs.getStringSet("authorized_senders", emptySet()).orEmpty()

        if (sourceId !in allowed) {
            if (looksLikeMoneyMessage(text)) rememberPackage(prefs, n.packageName)
            return
        }
        scope.launch {
            try {
                PaymentCaptureProcessor.process(
                    applicationContext, sourceId, text, n.postTime,
                    PaymentCaptureProcessor.CHANNEL_NOTIFICATION
                )
            } catch (_: Exception) {
                // Never log notification contents.
            }
        }
    }

    private fun rememberPackage(prefs: android.content.SharedPreferences, pkg: String) {
        val seen = prefs.getStringSet("seen_packages", emptySet()).orEmpty().toMutableSet()
        if (seen.size >= 30 && pkg !in seen) return
        if (seen.add(pkg)) prefs.edit().putStringSet("seen_packages", seen).apply()
    }

    companion object {
        fun notificationSourceId(packageName: String) = "app:$packageName"
        private val money = Regex("(?i)(?:bs\\.?|ves)\\s*[0-9]|[0-9]\\s*(?:bs\\b|ves\\b)")
        fun looksLikeMoneyMessage(text: String) = money.containsMatchIn(text)
    }
}
