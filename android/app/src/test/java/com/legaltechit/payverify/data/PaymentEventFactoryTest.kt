package com.legaltechit.payverify.data

import org.junit.Assert.assertEquals
import org.junit.Test

class PaymentEventFactoryTest {
    @Test fun normalizedInputsCreateStableIdempotencyKey() {
        val a = PaymentEventFactory.idempotencyKey(" BANK ", 12500, " ref-123 ", 1700000000000)
        val b = PaymentEventFactory.idempotencyKey("bank", 12500, "REF-123", 1700000000000)
        assertEquals(a, b)
        assertEquals(a, PaymentFingerprint.create(12500, "VES", "REF-123", 1700000000000, "bank"))
    }
}
