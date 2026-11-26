package com.legaltechit.payverify.sms

import android.content.Context
import com.legaltechit.payverify.data.PayVerifyDatabaseProvider
import com.legaltechit.payverify.data.PaymentEventEntity
import com.legaltechit.payverify.data.PaymentEventFactory
import com.legaltechit.payverify.data.PaymentFingerprint
import com.legaltechit.payverify.sync.PaymentSyncScheduler
import java.math.RoundingMode

/**
 * Single entry point for every capture channel (SMS and bank-app notifications).
 * Never logs or stores the message text. Only structured fields leave this method.
 */
object PaymentCaptureProcessor {
    const val CHANNEL_SMS = "sms"
    const val CHANNEL_NOTIFICATION = "notification"
    private const val DUPLICATE_WINDOW_MS = 48L * 60 * 60 * 1000

    /**
     * @param sourceId SMS sender, or "app:<package>" for notifications.
     * @return true if a new payment was stored.
     */
    suspend fun process(
        context: Context,
        sourceId: String,
        body: String,
        timeMillis: Long,
        channel: String
    ): Boolean {
        val prefs = context.getSharedPreferences("payverify", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("capture_enabled", false)) return false
        val allowed = prefs.getStringSet("authorized_senders", emptySet())?.toSet().orEmpty()
        if (sourceId !in allowed) return false

        val parsed = PaymentSmsParser.parse(sourceId, body, allowed)
        if (parsed !is ParseResult.Success) {
            // Only a counter and a generic reason: no text, no numbers.
            val reason = (parsed as ParseResult.Rejected).reason
            if (reason != "Mensaje de autenticación rechazado" && reason != "No parece pago recibido") {
                prefs.edit()
                    .putInt("unparsed_count", prefs.getInt("unparsed_count", 0) + 1)
                    .putString("unparsed_last_reason", reason)
                    .apply()
            }
            return false
        }
        val p = parsed.payment
        val amountMinor = p.amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact()
        val transactionTime = timeMillis.takeIf { it > 0L } ?: System.currentTimeMillis()
        val now = System.currentTimeMillis()

        val dao = PayVerifyDatabaseProvider.get(context).paymentEventDao()
        // Same payment already captured through another channel: keep the first one.
        if (dao.countSamePayment(amountMinor, p.reference, now - DUPLICATE_WINDOW_MS) > 0) return false

        val key = PaymentFingerprint.create(amountMinor, p.currency, p.reference, transactionTime, sourceId)
        val inserted = dao.insertIfNew(
            PaymentEventEntity(
                id = PaymentEventFactory.newId(),
                amountMinorUnits = amountMinor,
                currency = p.currency,
                reference = p.reference,
                sender = sourceId,
                transactionTimeMillis = transactionTime,
                detectedTimeMillis = now,
                status = "SMS_DETECTED",
                syncStatus = "pending",
                idempotencyKey = key,
                originPhone = p.originPhone,
                originPhoneLast4 = p.originPhoneLast4,
                originBankCode = p.originBankCode,
                channel = channel
            )
        ) != -1L
        if (inserted) {
            PaymentSyncScheduler.schedule(context)
            PaymentSyncScheduler.enqueueNow(context)
        }
        return inserted
    }
}
