package com.legaltechit.payverify.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PaymentSmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val prefs = context.getSharedPreferences("payverify", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("capture_enabled", false) ||
            !prefs.getBoolean("sms_permission_granted", false)) return
        if (prefs.getStringSet("authorized_senders", emptySet()).isNullOrEmpty()) return

        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Telephony.Sms.Intents.getMessagesFromIntent(intent).forEach { sms ->
                    val sender = sms.originatingAddress?.trim() ?: return@forEach
                    PaymentCaptureProcessor.process(
                        context, sender, sms.messageBody.orEmpty(),
                        sms.timestampMillis, PaymentCaptureProcessor.CHANNEL_SMS
                    )
                }
            } catch (_: Exception) {
                // Do not log SMS contents or sender details.
            } finally {
                pending.finish()
            }
        }
    }
}
