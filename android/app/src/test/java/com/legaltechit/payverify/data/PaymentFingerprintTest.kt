package com.legaltechit.payverify.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class PaymentFingerprintTest {
    @Test fun sameStructuredFieldsProduceSameKey() {
        val a = PaymentFingerprint.create(2500, "VES", "ab-123", 1700000000000, "BANK")
        val b = PaymentFingerprint.create(2500, "VES", " AB-123 ", 1700000000000, " bank ")
        assertEquals(a, b)
    }

    @Test fun changedAmountProducesDifferentKey() {
        val a = PaymentFingerprint.create(2500, "VES", "ab-123", 1700000000000, "BANK")
        val b = PaymentFingerprint.create(2501, "VES", "ab-123", 1700000000000, "BANK")
        assertNotEquals(a, b)
    }
}
