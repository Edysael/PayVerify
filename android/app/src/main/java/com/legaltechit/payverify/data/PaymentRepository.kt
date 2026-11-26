package com.legaltechit.payverify.data

import kotlinx.coroutines.flow.Flow

class PaymentRepository(private val dao: PaymentEventDao) {
    fun observePayments(): Flow<List<PaymentEventEntity>> = dao.observeAll()
    suspend fun saveDetected(event: PaymentEventEntity): Boolean = dao.insertIfNew(event) != -1L
    suspend fun pendingForSync(): List<PaymentEventEntity> = dao.pending()
    suspend fun markSync(id: String, status: String) = dao.updateSyncStatus(id, status)
}
