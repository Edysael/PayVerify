package com.legaltechit.payverify.sync

object PaymentSyncPolicy {
    const val BATCH_SIZE = 50
    const val MAX_ATTEMPTS = 9

    fun nextDelayMinutes(attempt: Int): Long {
        val safe = attempt.coerceIn(0, MAX_ATTEMPTS)
        return (1L shl safe).coerceAtMost(6L * 60L)
    }

    fun shouldRetry(result: SyncResult): Boolean = result is SyncResult.RetryableError

    fun terminalStatus(result: SyncResult): String = when (result) {
        SyncResult.Success -> "synced"
        is SyncResult.Rejected -> "rejected"
        is SyncResult.RetryableError -> "error"
    }
}
