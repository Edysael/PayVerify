package com.legaltechit.payverify.receiving

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * Interruptor "Recibir pagos". Activado = captura encendida + servicio en primer plano
 * (notificación fija) que mantiene la app despierta, envía cada pago al instante y manda el latido.
 */
object ReceivingController {
    private const val KEY = "receiving_enabled"

    fun isEnabled(ctx: Context): Boolean = prefs(ctx).getBoolean(KEY, false)

    fun enable(ctx: Context) {
        prefs(ctx).edit().putBoolean(KEY, true).putBoolean("capture_enabled", true).apply()
        ContextCompat.startForegroundService(ctx, Intent(ctx, ReceivingService::class.java))
    }

    fun disable(ctx: Context) {
        prefs(ctx).edit().putBoolean(KEY, false).putBoolean("capture_enabled", false).apply()
        // El servicio manda un último latido "pausado" y se detiene solo.
        ctx.startService(Intent(ctx, ReceivingService::class.java).setAction(ReceivingService.ACTION_STOP))
    }

    /** Tras reiniciar el teléfono o actualizar la app: vuelve a encender si estaba activado. */
    fun restoreIfEnabled(ctx: Context) {
        if (isEnabled(ctx)) ContextCompat.startForegroundService(ctx, Intent(ctx, ReceivingService::class.java))
    }

    /** Pide a Android que no duerma a PayVerify (diálogo del sistema, una sola vez). */
    @SuppressLint("BatteryLife")
    fun batteryExemptionIntent(ctx: Context): Intent =
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}"))

    private fun prefs(ctx: Context) = ctx.getSharedPreferences("payverify", Context.MODE_PRIVATE)
}
