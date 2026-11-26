package com.legaltechit.payverify.ui

object PaymentStatusLabels {
    fun label(status: String): String = when (status) {
        "SMS_DETECTED" -> "SMS detectado"
        "DATA_EXTRACTED" -> "Datos extraídos"
        "RECEIVED_BY_SERVER" -> "Recibido por servidor"
        "PENDING_REVIEW" -> "Pendiente de revisión"
        "RECONCILED" -> "Conciliado"
        "POSSIBLE_DUPLICATE" -> "Posible duplicado"
        "PARSING_ERROR" -> "Error de lectura"
        "REJECTED" -> "Rechazado"
        else -> "Estado desconocido"
    }
}
