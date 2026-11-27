package com.legaltechit.payverify.receiving

import android.content.Context
import android.os.PowerManager
import com.legaltechit.payverify.security.SecureConfig
import com.legaltechit.payverify.security.SupabaseMobileAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Avisa a PayVerify (device-heartbeat) que este teléfono sigue conectado y si está escuchando pagos. */
object Heartbeat {
    sealed class Result {
        data object Ok : Result()
        data object NotConfigured : Result()
        data object PendingApproval : Result()
        data object Revoked : Result()
        data class Failed(val code: Int) : Result()
    }

    suspend fun send(context: Context, captureActive: Boolean): Result = withContext(Dispatchers.IO) {
        val ctx = context.applicationContext
        val base = SecureConfig.get(ctx, "supabase_url").trimEnd('/')
        val key = SecureConfig.get(ctx, "anon_key")
        val org = SecureConfig.get(ctx, "organization_id")
        val device = SecureConfig.get(ctx, "device_id")
        if (listOf(base, key, org, device, SecureConfig.get(ctx, "access_token")).any { it.isBlank() }) {
            return@withContext record(ctx, Result.NotConfigured)
        }
        val body = JSONObject().put("organizationId", org).put("deviceId", device)
            .put("captureActive", captureActive).put("batteryUnrestricted", batteryUnrestricted(ctx))
        appVersion(ctx)?.let { body.put("appVersion", it) }
        var code = post(base, key, SecureConfig.get(ctx, "access_token"), body)
        if (code == 401 && SupabaseMobileAuth.refresh(ctx)) code = post(base, key, SecureConfig.get(ctx, "access_token"), body)
        record(ctx, when {
            code in 200..299 -> Result.Ok
            code == 425 -> Result.PendingApproval
            code == 403 -> Result.Revoked
            else -> Result.Failed(code)
        })
    }

    private fun post(base: String, key: String, token: String, body: JSONObject): Int {
        var c: HttpURLConnection? = null
        return try {
            c = (URL("$base/functions/v1/device-heartbeat").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"; connectTimeout = 15_000; readTimeout = 20_000; doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("apikey", key)
                setRequestProperty("Authorization", "Bearer $token")
            }
            c.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            c.responseCode
        } catch (_: Exception) { -1 } finally { c?.disconnect() }
    }

    /** Guarda el resultado para que la pantalla y la notificación lo muestren. */
    private fun record(ctx: Context, r: Result): Result {
        val e = ctx.getSharedPreferences("payverify", Context.MODE_PRIVATE).edit()
        when (r) {
            Result.Ok -> e.putLong("hb_last_ok_at", System.currentTimeMillis()).putString("hb_last_error", "")
            Result.NotConfigured -> e.putString("hb_last_error", "Falta configurar la conexión, iniciar sesión o enrolar el dispositivo.")
            Result.PendingApproval -> e.putString("hb_last_error", "El dispositivo espera aprobación en el panel (Dispositivos).")
            Result.Revoked -> e.putString("hb_last_error", "Este dispositivo fue rechazado o revocado. Solicita uno nuevo.")
            is Result.Failed -> e.putString("hb_last_error", if (r.code < 0) "Sin internet: se reintentará solo." else "PayVerify respondió ${r.code}; se reintentará solo.")
        }
        e.apply()
        return r
    }

    fun batteryUnrestricted(ctx: Context): Boolean =
        (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(ctx.packageName)

    private fun appVersion(ctx: Context): String? = try {
        ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName
    } catch (_: Exception) { null }
}
