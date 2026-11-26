package com.legaltechit.payverify.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentEventDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIfNew(event: PaymentEventEntity): Long

    @Query("SELECT * FROM payment_events_local ORDER BY detectedTimeMillis DESC")
    fun observeAll(): Flow<List<PaymentEventEntity>>

    @Query("SELECT * FROM payment_events_local WHERE syncStatus IN ('pending','error') ORDER BY detectedTimeMillis LIMIT :limit")
    suspend fun pending(limit: Int = 50): List<PaymentEventEntity>

    @Query("UPDATE payment_events_local SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String)

    /** Same payment announced twice (e.g. SMS + app notification). */
    @Query("SELECT COUNT(*) FROM payment_events_local WHERE amountMinorUnits = :amount AND reference = :reference AND detectedTimeMillis >= :since")
    suspend fun countSamePayment(amount: Long, reference: String, since: Long): Int

    @Query("SELECT COUNT(*) FROM payment_events_local")
    suspend fun count(): Int
}
