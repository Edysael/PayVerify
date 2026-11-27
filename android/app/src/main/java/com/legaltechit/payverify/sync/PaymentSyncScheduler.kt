package com.legaltechit.payverify.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object PaymentSyncScheduler {
    private const val PERIODIC = "payverify-periodic-sync"
    fun schedule(context: Context) {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val request = PeriodicWorkRequestBuilder<PaymentSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request
        )
    }
    fun enqueueNow(context: Context) {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val request = OneTimeWorkRequestBuilder<PaymentSyncWorker>().setConstraints(constraints).build()
        // APPEND_OR_REPLACE: un pago que llega mientras se envía otro queda en cola detrás, no se descarta.
        WorkManager.getInstance(context).enqueueUniqueWork("payverify-sync-now", ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }
}
