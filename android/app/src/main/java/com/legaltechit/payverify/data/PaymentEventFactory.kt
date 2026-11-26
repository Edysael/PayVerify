package com.legaltechit.payverify.data

import java.security.MessageDigest
import java.util.UUID

object PaymentEventFactory {
    fun idempotencyKey(sender: String, amountMinor: Long, reference: String, timeMillis: Long): String {
        val raw = "${sender.trim().uppercase()}|$amountMinor|${reference.trim().uppercase()}|$timeMillis"
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun newId(): String = UUID.randomUUID().toString()
}
