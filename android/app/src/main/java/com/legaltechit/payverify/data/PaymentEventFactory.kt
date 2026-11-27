package com.legaltechit.payverify.data

import java.util.UUID

object PaymentEventFactory {
    fun idempotencyKey(sender: String, amountMinor: Long, reference: String, timeMillis: Long, currency: String = "VES"): String =
        PaymentFingerprint.create(amountMinor, currency, reference, timeMillis, sender)

    fun newId(): String = UUID.randomUUID().toString()
}
