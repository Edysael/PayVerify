package com.legaltechit.payverify.sms

object SmsValidation {
    private val forbidden = Regex("(?i)(otp|clave|contraseña|password|c[oó]digo de seguridad|token)")

    fun looksLikeAuthenticationMessage(body: String): Boolean = forbidden.containsMatchIn(body)

    fun normalizeSender(sender: String): String = sender.trim().replace(Regex("\\s+"), "")
}
