package com.legaltechit.payverify.sync

/**
 * Contract for the authenticated sync implementation.
 * Device credential provisioning and backend validation must be completed
 * before this interface is connected to a production endpoint.
 */
data class PaymentSyncPayload(
    val eventId: String,
    val amountMinorUnits: Long,
    val currency: String,
    val reference: String,
    val senderIdentifier: String,
    val transactionTimeMillis: Long,
    val idempotencyKey: String,
    val originPhone: String? = null,
    val originPhoneLast4: String? = null,
    val originBankCode: String? = null,
    val channel: String = "sms"
)

sealed interface SyncResult {
    data object Success : SyncResult
    data class RetryableError(val message: String) : SyncResult
    data class Rejected(val message: String) : SyncResult
}
