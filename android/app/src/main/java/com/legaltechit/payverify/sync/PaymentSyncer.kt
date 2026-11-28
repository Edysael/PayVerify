package com.legaltechit.payverify.sync

import android.content.Context
import com.legaltechit.payverify.data.PayVerifyDatabaseProvider
import com.legaltechit.payverify.data.PaymentEventDao
import com.legaltechit.payverify.data.PaymentEventEntity
import com.legaltechit.payverify.security.SecureConfig
import com.legaltechit.payverify.security.SupabaseMobileAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Envía a PayVerify todos los pagos pendientes. Lo usan el servicio "Recibir pagos"
 * (al instante, apenas se detecta un pago) y PaymentSyncWorker (respaldo de WorkManager).
 * Un solo envío a la vez por proceso; el servidor es idempotente, así que un reenvío no duplica.
 */
object PaymentSyncer {
    enum class Outcome { DONE, RETRY, NOT_CONFIGURED }

    private val lock = Mutex()
    private const val MAX_BATCHES = 20

    suspend fun syncPending(context: Context): Outcome = withContext(Dispatchers.IO) {
        lock.withLock { drain(context.applicationContext) }
    }

    private suspend fun drain(context: Context): Outcome {
        val baseUrl = SecureConfig.get(context, "supabase_url").trimEnd('/')
        val anonKey = SecureConfig.get(context, "anon_key")
        val orgId = SecureConfig.get(context, "organization_id")
        val deviceId = SecureConfig.get(context, "device_id")
        if (listOf(baseUrl, anonKey, SecureConfig.get(context, "access_token"), orgId, deviceId).any { it.isBlank() }) {
            return Outcome.NOT_CONFIGURED
        }
        val dao = PayVerifyDatabaseProvider.get(context).paymentEventDao()
        repeat(MAX_BATCHES) {
            val pending = dao.pending(PaymentSyncPolicy.BATCH_SIZE)
            if (pending.isEmpty()) return Outcome.DONE
            // Ante un error reintentable se corta aquí: lo retoma el próximo latido o WorkManager.
            if (sendBatch(context, dao, pending, baseUrl, anonKey, orgId, deviceId)) return Outcome.RETRY
        }
        return Outcome.DONE
    }

    /** @return true si algún pago quedó para reintentar. */
    private suspend fun sendBatch(
        context: Context, dao: PaymentEventDao, pending: List<PaymentEventEntity>,
        baseUrl: String, anonKey: String, orgId: String, deviceId: String,
    ): Boolean {
        var retry = false
        for (event in pending) {
            val payload = SyncPayloadMapper.map(event)
            if (payload == null) { dao.updateSyncStatus(event.id, "rejected"); continue }
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
                val token = SecureConfig.get(context, "access_token")
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
                        dao.updateSyncStatus(event.id, "error"); retry = true
                    }
                    code == 401 -> {
                        dao.updateSyncStatus(event.id, "error")
                        SupabaseMobileAuth.refresh(context)
                        retry = true
                    }
                    else -> dao.updateSyncStatus(event.id, "rejected")
                }
            } catch (_: Exception) {
                dao.updateSyncStatus(event.id, "error"); retry = true
            } finally {
                connection?.disconnect()
            }
        }
        return retry
    }
}
