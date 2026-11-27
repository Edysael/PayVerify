package com.legaltechit.payverify.sms

import java.math.BigDecimal

data class ParsedPayment(
    val amount: BigDecimal,
    val currency: String,
    val reference: String,
    /** Full origin phone (digits, e.g. 04125559812) when the message shows it complete. */
    val originPhone: String? = null,
    /** Last 4 digits of the origin phone, also when the bank masks the number. */
    val originPhoneLast4: String? = null,
    /** 4-digit code of the payer's bank when the message states it. */
    val originBankCode: String? = null
)

sealed interface ParseResult {
    data class Success(val payment: ParsedPayment) : ParseResult
    data class Rejected(val reason: String) : ParseResult
}

object PaymentSmsParser {
    private val amountRx = Regex("(?i)(?:Bs\\.?|VES)\\s*([0-9][0-9.,]*)|([0-9][0-9.,]*)\\s*(?:Bs\\.?|VES)")
    private val refRx = Regex(
        "(?i)(?:ref(?:erencia)?\\.?|refer|n[uú]mero\\s+de\\s+operaci[oó]n|operaci[oó]n|comprobante)" +
            "\\s*(?:n[°ºo]\\.?)?\\s*[:#-]?\\s*([A-Z0-9/_-]{4,64})"
    )
    private val otpRx = Regex("(?i)\\b(OTP|clave\\s+din[aá]mica|c[oó]digo\\s+de\\s+seguridad|token)\\b")
    private val incomingRx = Regex(
        "(?i)\\b(recibiste|recibido|recibida|pago\\s+recibido|abono|acreditad[oa]|te\\s+(?:han\\s+)?(?:enviado|transferido)|pago\\s*m[oó]vil\\s+recibido)\\b"
    )
    // Outgoing/debit alerts must never be read as an incoming payment.
    private val outgoingRx = Regex(
        "(?i)\\b(enviaste|transferiste|pagaste|realizaste|d[eé]bito|debitad[oa]|retiro|cargo\\s+a\\s+tu)\\b"
    )
    private val phoneFullRx = Regex("(?<!\\d)(?:\\+?58)?0?(4(?:12|14|16|24|26))[-. ]?(\\d{3})[-. ]?(\\d{4})(?!\\d)")
    private val phoneMaskedRx = Regex("(?<!\\d)(?:\\+?58)?0?(4(?:12|14|16|24|26))[-. ]?[*xX•#]+[-. ]?(\\d{2,4})(?!\\d)")
    private val bankCodeRx = Regex("(?i)(?:banco|desde|origen|emisor|de)\\s*:?\\s*(01\\d{2})(?!\\d)")
    private val bankNameRx = Regex(
        "(?i)(?:desde|origen|emisor|banco\\s+emisor|del\\s+banco|de\\s+banco)\\s*:?\\s*(?:el\\s+)?(?:banco\\s+)?([\\p{L}0-9% ]{3,30})"
    )

    private fun normalizeAmount(raw: String): String? {
        val value = raw.trim().trimEnd('.', ',')
        if (value.isEmpty()) return null
        val comma = value.lastIndexOf(',')
        val dot = value.lastIndexOf('.')
        if (comma >= 0 && dot >= 0) {
            val decimal = if (comma > dot) ',' else '.'
            val grouping = if (decimal == ',') '.' else ','
            val normalized = value.replace(grouping.toString(), "").replace(decimal, '.')
            return normalized.takeIf { Regex("^\\d+(?:\\.\\d{1,2})?$").matches(it) }
        }
        val sep = if (comma >= 0) ',' else if (dot >= 0) '.' else null
        if (sep == null) return value.takeIf { it.all(Char::isDigit) }
        val parts = value.split(sep)
        if (parts.size != 2 || parts.any { it.isEmpty() || !it.all(Char::isDigit) }) return null
        val decimals = parts[1].length
        return when {
            decimals == 3 -> parts[0] + parts[1]
            decimals in 1..2 -> parts[0] + "." + parts[1]
            else -> null
        }
    }

    private fun looksLikeReference(value: String) = value.count(Char::isDigit) >= 3

    private fun extractPhone(body: String, tpl: SmsTemplate?): Pair<String?, String?> {
        tpl?.originPhonePattern?.find(body)?.groupValues?.getOrNull(1)?.let { raw ->
            val digits = raw.filter(Char::isDigit)
            if (digits.length >= 4) return (digits.takeIf { it.length >= 10 }) to digits.takeLast(4)
        }
        phoneFullRx.find(body)?.let { m ->
            val full = "0" + m.groupValues[1] + m.groupValues[2] + m.groupValues[3]
            return full to full.takeLast(4)
        }
        phoneMaskedRx.find(body)?.let { m ->
            val tail = m.groupValues[2]
            return null to tail.takeIf { it.length == 4 }
        }
        return null to null
    }

    private fun extractBank(body: String, tpl: SmsTemplate?): String? {
        tpl?.originBankPattern?.find(body)?.groupValues?.getOrNull(1)?.trim()?.let { raw ->
            if (BankDirectory.isKnownCode(raw)) return raw
            BankDirectory.codeForKeyword(raw)?.let { return it }
        }
        bankCodeRx.find(body)?.groupValues?.get(1)?.let { if (BankDirectory.isKnownCode(it)) return it }
        // Only names introduced by "desde/origen/emisor": the receiving bank often opens the message.
        bankNameRx.find(body)?.groupValues?.get(1)?.let { return BankDirectory.codeForKeyword(it) }
        return null
    }

    fun parse(sender: String, body: String, allow: Set<String>): ParseResult {
        if (sender.trim() !in allow) return ParseResult.Rejected("Remitente no autorizado")
        if (otpRx.containsMatchIn(body)) return ParseResult.Rejected("Mensaje de autenticación rechazado")
        val templates = SmsTemplates.forSender(sender.trim())
        val tpl = templates.firstOrNull { it.successPhrase.containsMatchIn(body) }
        if (tpl == null) {
            if (!incomingRx.containsMatchIn(body)) return ParseResult.Rejected("No parece pago recibido")
            if (outgoingRx.containsMatchIn(body)) return ParseResult.Rejected("Parece un movimiento de salida")
        }
        val rawAmount = tpl?.amountPattern?.find(body)?.groupValues?.getOrNull(1)
            ?: amountRx.find(body)?.let { it.groups[1]?.value ?: it.groups[2]?.value }
            ?: return ParseResult.Rejected("Monto no identificado")
        val normalized = normalizeAmount(rawAmount) ?: return ParseResult.Rejected("Monto inválido")
        val amount = normalized.toBigDecimalOrNull() ?: return ParseResult.Rejected("Monto inválido")
        if (amount <= BigDecimal.ZERO) return ParseResult.Rejected("Monto debe ser positivo")
        val ref = (tpl?.referencePattern?.find(body)?.groupValues?.getOrNull(1)
            ?: refRx.find(body)?.groupValues?.get(1))
            ?.takeIf { looksLikeReference(it) }
            ?: return ParseResult.Rejected("Referencia no identificada")
        val (phone, last4) = extractPhone(body, tpl)
        return ParseResult.Success(
            ParsedPayment(amount, "VES", ref, phone, last4, extractBank(body, tpl))
        )
    }
}
