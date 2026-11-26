package com.legaltechit.payverify.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.legaltechit.payverify.data.PayVerifyDatabaseProvider
import com.legaltechit.payverify.security.SecureConfig
import com.legaltechit.payverify.security.SupabaseMobileAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class PaymentSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val baseUrl = SecureConfig.get(applicationContext, "supabase_url").trimEnd('/')
        val anonKey = SecureConfig.get(applicationContext, "anon_key")
        val token = SecureConfig.get(applicationContext, "access_token")
        val orgId = SecureConfig.get(applicationContext, "organization_id")
        val deviceId = SecureConfig.get(applicationContext, "device_id")
        if (listOf(baseUrl, anonKey, token, orgId, deviceId).any { it.isBlank() }) {
            return@withContext Result.failure()
        }

        val db = PayVerifyDatabaseProvider.get(applicationContext)
        val dao = db.paymentEventDao()
        val pending = dao.pending(PaymentSyncPolicy.BATCH_SIZE)
        if (pending.isEmpty()) return@withContext Result.success()

        var retry = false
        pending.forEach { event ->
            val payload = SyncPayloadMapper.map(event)
            if (payload == null) {
                dao.updateSyncStatus(event.id, "rejected")
                return@forEach
            }
            val json = JSONObject()
                .put("organizationId", orgId)
                .put("deviceId", deviceId)
                .put("eventId", payload.eventId)
                .put("amountMinorUnits", payload.amountMinorUnits)
                .put("currency", payload.currency)
                .put("reference", payload.reference)
                .put("senderIdentifier", payload.senderIdentifier)
                .put("transactionTimeMillis", payload.transactionTimeMillis)
                .put("idempotencyKey", payload.idempotencyKey)
                .put("channel", payload.channel)
            payload.originPhone?.let { json.put("originPhone", it) }
            payload.originPhoneLast4?.let { json.put("originPhoneLast4", it) }
            payload.originBankCode?.let { json.put("originBankCode", it) }

            var connection: HttpURLConnection? = null
            try {
                connection = (URL("$baseUrl/functions/v1/payment-event-ingest").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 15_000
                    readTimeout = 20_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("apikey", anonKey)
                    setRequestProperty("Authorization", "Bearer $token")
                }
                connection.outputStream.use { it.write(json.toString().toByteArray(Charsets.UTF_8)) }
                val code = connection.responseCode
                when {
                    code in 200..299 -> dao.updateSyncStatus(event.id, "synced")
                    code == 408 || code == 425 || code == 429 || code >= 500 -> {
                        dao.updateSyncStatus(event.id, "error")
                        retry = true
                    }
                    code == 401 -> {
                        dao.updateSyncStatus(event.id, "error")
                        SupabaseMobileAuth.refresh(applicationContext)
                        retry = true
                    }
                    code == 403 -> {
                        dao.updateSyncStatus(event.id, "rejected")
                    }
                    else -> dao.updateSyncStatus(event.id, "rejected")
                }
            } catch (_: Exception) {
                dao.updateSyncStatus(event.id, "error")
                retry = true
            } finally {
                connection?.disconnect()
            }
        }
        if (retry) Result.retry() else Result.success()
    }
}
