package com.legaltechit.payverify.sync

import com.legaltechit.payverify.data.PaymentEventEntity
import com.legaltechit.payverify.data.PaymentLocalRules

object SyncPayloadMapper {
    fun map(event: PaymentEventEntity): PaymentSyncPayload? {
        if (!PaymentLocalRules.validAmount(event.amountMinorUnits)) return null
        if (!PaymentLocalRules.validReference(event.reference)) return null
        if (event.currency != "VES") return null
        return PaymentSyncPayload(
            eventId = event.id,
            amountMinorUnits = event.amountMinorUnits,
            currency = event.currency,
            reference = event.reference,
            senderIdentifier = event.sender,
            transactionTimeMillis = event.transactionTimeMillis,
            idempotencyKey = event.idempotencyKey,
            originPhone = event.originPhone,
            originPhoneLast4 = event.originPhoneLast4,
            originBankCode = event.originBankCode,
            channel = event.channel
        )
    }
}
