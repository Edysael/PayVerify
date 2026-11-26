package com.legaltechit.payverify.data

import java.security.MessageDigest
import java.util.Locale

/**
 * Stable duplicate key from normalized transaction fields.
 * Never accepts or hashes the original SMS body.
 */
object PaymentFingerprint {
    fun create(
        amountMinorUnits: Long,
        currency: String,
        reference: String,
        transactionTimeMillis: Long,
        sender: String
    ): String {
        require(amountMinorUnits > 0) { "amount must be positive" }
        require(currency.matches(Regex("[A-Z]{3}"))) { "currency must be ISO-like uppercase code" }
        require(reference.isNotBlank() && reference.length <= 120) { "invalid reference" }

        val normalized = listOf(
            amountMinorUnits.toString(),
            currency.uppercase(Locale.ROOT),
            reference.trim().uppercase(Locale.ROOT),
            transactionTimeMillis.toString(),
            sender.trim().uppercase(Locale.ROOT)
        ).joinToString("|")

        val bytes = MessageDigest.getInstance("SHA-256")
            .digest(normalized.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
