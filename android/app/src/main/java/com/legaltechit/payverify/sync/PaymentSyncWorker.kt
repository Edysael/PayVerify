package com.legaltechit.payverify.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/** Respaldo de WorkManager: envía lo pendiente aunque el servicio "Recibir pagos" no esté corriendo. */
class PaymentSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = when (PaymentSyncer.syncPending(applicationContext)) {
        PaymentSyncer.Outcome.DONE -> Result.success()
        PaymentSyncer.Outcome.RETRY -> Result.retry()
        PaymentSyncer.Outcome.NOT_CONFIGURED -> Result.failure()
    }
}
