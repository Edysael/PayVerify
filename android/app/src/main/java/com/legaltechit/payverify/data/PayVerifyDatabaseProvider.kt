package com.legaltechit.payverify.data

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

object PayVerifyDatabaseProvider {
    /** v1 -> v2: origin phone/bank hints and capture channel. Purely additive. */
    val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("ALTER TABLE payment_events_local ADD COLUMN originPhone TEXT")
            db.execSQL("ALTER TABLE payment_events_local ADD COLUMN originPhoneLast4 TEXT")
            db.execSQL("ALTER TABLE payment_events_local ADD COLUMN originBankCode TEXT")
            db.execSQL("ALTER TABLE payment_events_local ADD COLUMN channel TEXT NOT NULL DEFAULT 'sms'")
        }
    }

    @Volatile private var instance: PayVerifyDatabase? = null
    fun get(context: Context): PayVerifyDatabase = instance ?: synchronized(this) {
        instance ?: Room.databaseBuilder(
            context.applicationContext, PayVerifyDatabase::class.java, "payverify.db"
        ).addMigrations(MIGRATION_1_2).build().also { instance = it }
    }
}
