package com.legaltechit.payverify.receiving

/** Reglas puras del latido (sin Android, para poder probarlas). */
object HeartbeatPolicy {
    /** Cada cuánto el teléfono avisa que sigue escuchando. El servidor lo da por desconectado tras 5 min. */
    const val INTERVAL_MS = 2L * 60 * 1000
    const val SERVER_ONLINE_WINDOW_MS = 5L * 60 * 1000

    /** Tras fallos seguidos se espera un poco más, sin pasar de 5 minutos. */
    fun delayAfter(consecutiveFailures: Int): Long =
        if (consecutiveFailures <= 0) INTERVAL_MS
        else (30_000L shl (consecutiveFailures - 1).coerceAtMost(4)).coerceAtMost(SERVER_ONLINE_WINDOW_MS)

    /** Texto corto para la app y la notificación. */
    fun describe(lastOkMillis: Long, nowMillis: Long): String {
        if (lastOkMillis <= 0) return "Aún sin conexión con PayVerify"
        val min = ((nowMillis - lastOkMillis).coerceAtLeast(0) / 60_000).toInt()
        return if (min < 1) "Conectado a PayVerify hace un momento" else "Conectado a PayVerify hace $min min"
    }

    fun isOnline(lastOkMillis: Long, nowMillis: Long): Boolean =
        lastOkMillis > 0 && nowMillis - lastOkMillis <= SERVER_ONLINE_WINDOW_MS
}
