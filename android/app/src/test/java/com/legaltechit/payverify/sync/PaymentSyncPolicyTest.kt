package com.legaltechit.payverify.sync

import org.junit.Assert.*
import org.junit.Test

class PaymentSyncPolicyTest {
    @Test fun backoffIsBounded() {
        assertEquals(1L, PaymentSyncPolicy.nextDelayMinutes(0))
        assertEquals(8L, PaymentSyncPolicy.nextDelayMinutes(3))
        assertEquals(360L, PaymentSyncPolicy.nextDelayMinutes(99))
    }
    @Test fun rejectedIsNotRetryable() {
        assertFalse(PaymentSyncPolicy.shouldRetry(SyncResult.Rejected("bad payload")))
        assertTrue(PaymentSyncPolicy.shouldRetry(SyncResult.RetryableError("network")))
    }
}
