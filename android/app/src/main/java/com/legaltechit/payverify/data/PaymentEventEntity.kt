package com.legaltechit.payverify.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "payment_events_local",
    indices = [Index(value = ["idempotencyKey"], unique = true), Index(value = ["transactionTimeMillis"])]
)
data class PaymentEventEntity(
    @PrimaryKey val id: String,
    val amountMinorUnits: Long,
    val currency: String,
    val reference: String,
    val sender: String,
    val transactionTimeMillis: Long,
    val detectedTimeMillis: Long,
    val status: String = "SMS_DETECTED",
    val syncStatus: String = "pending",
    val idempotencyKey: String,
    val originPhone: String? = null,
    val originPhoneLast4: String? = null,
    val originBankCode: String? = null,
    /** "sms" or "notification" */
    val channel: String = "sms"
)
