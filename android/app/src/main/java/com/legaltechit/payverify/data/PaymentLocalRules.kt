package com.legaltechit.payverify.data

object PaymentLocalRules {
    const val MAX_REFERENCE_LENGTH = 64
    const val MAX_AMOUNT_MINOR = 9_000_000_000_000_000L
    fun validReference(value: String): Boolean =
        value.isNotBlank() && value.length <= MAX_REFERENCE_LENGTH &&
            value.all { it.isLetterOrDigit() || it in "-_/" }
    fun validAmount(amountMinorUnits: Long): Boolean =
        amountMinorUnits in 1..MAX_AMOUNT_MINOR
    fun userFacingStatus(status: String): String = when (status) {
        "SMS_DETECTED" -> "Notificación SMS detectada"
        "DATA_EXTRACTED" -> "Datos extraídos"
        "RECEIVED_BY_SERVER" -> "Recibido por el servidor"
        "PENDING_REVIEW" -> "Pendiente de revisión"
        "RECONCILED" -> "Conciliado con movimiento"
        "POSSIBLE_DUPLICATE" -> "Posible duplicado"
        "PARSING_ERROR" -> "No se pudo interpretar"
        "REJECTED" -> "Rechazado"
        else -> "Estado desconocido"
    }
}
