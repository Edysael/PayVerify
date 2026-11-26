package com.legaltechit.payverify.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [PaymentEventEntity::class], version = 2, exportSchema = false)
abstract class PayVerifyDatabase : RoomDatabase() {
    abstract fun paymentEventDao(): PaymentEventDao
}
