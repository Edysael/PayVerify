package com.legaltechit.payverify.receiving

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.legaltechit.payverify.MainActivity
import com.legaltechit.payverify.sync.PaymentSyncer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date

/**
 * Servicio en primer plano de "Recibir pagos": notificación fija, envío inmediato de cada pago
 * detectado y latido periódico a PayVerify. Android no lo duerme mientras está activo.
 */
class ReceivingService : Service() {
    companion object {
        const val ACTION_STOP = "com.legaltechit.payverify.receiving.STOP"
        private const val CHANNEL_ID = "payverify_receiving"
        private const val NOTIFICATION_ID = 4210
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var loop: Job? = null
    private var failures = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            goForeground("Desactivando…")
            loop?.cancel(); loop = null
            scope.launch {
                Heartbeat.send(this@ReceivingService, captureActive = false)
                ServiceCompat.stopForeground(this@ReceivingService, ServiceCompat.STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            return START_NOT_STICKY
        }
        if (!ReceivingController.isEnabled(this)) { stopSelf(); return START_NOT_STICKY }
        goForeground("Escuchando pagos…")
        if (loop == null) loop = scope.launch { run() }
        return START_STICKY
    }

    private suspend fun run() = coroutineScope {
        // Envío inmediato cada vez que se detecta un pago (SMS o notificación del banco).
        launch { SyncSignal.events.collect { withWakeLock { PaymentSyncer.syncPending(this@ReceivingService) } } }
        while (isActive) {
            val result = withWakeLock {
                val r = Heartbeat.send(this@ReceivingService, captureActive = true)
                PaymentSyncer.syncPending(this@ReceivingService)
                r
            }
            failures = if (result == Heartbeat.Result.Ok) 0 else failures + 1
            goForeground(statusText(result))
            delay(HeartbeatPolicy.delayAfter(failures))
        }
    }

    private fun statusText(r: Heartbeat.Result): String = when (r) {
        Heartbeat.Result.Ok -> "Escuchando pagos · conectado ${DateFormat.getTimeInstance(DateFormat.SHORT).format(Date())}"
        Heartbeat.Result.PendingApproval -> "Esperando aprobación del dispositivo en el panel"
        Heartbeat.Result.Revoked -> "Dispositivo revocado: ábreme para revisarlo"
        Heartbeat.Result.NotConfigured -> "Falta configurar la conexión: ábreme"
        is Heartbeat.Result.Failed -> "Escuchando pagos · sin conexión, reintentando"
    }

    /** Mantiene la CPU despierta solo mientras se envía (máx. 60 s). */
    private suspend fun <T> withWakeLock(block: suspend () -> T): T {
        val wl = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PayVerify:sync")
        wl.acquire(60_000)
        try { return block() } finally { if (wl.isHeld) wl.release() }
    }

    private fun goForeground(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Recibir pagos", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Indica que PayVerify está escuchando los avisos de pago del banco."
                setShowBadge(false)
            })
        }
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("PayVerify activo")
            .setContentText(text)
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    }

    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}
