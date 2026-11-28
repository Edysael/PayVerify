package com.legaltechit.payverify.receiving

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Si "Recibir pagos" estaba activado, vuelve a encenderlo al reiniciar el teléfono o actualizar la app. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> try {
                ReceivingController.restoreIfEnabled(context)
            } catch (_: Exception) {
                // Si Android no permite iniciarlo ahora, se activa al abrir la app.
            }
        }
    }
}
