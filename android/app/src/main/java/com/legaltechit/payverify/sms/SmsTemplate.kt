package com.legaltechit.payverify.sms

/**
 * A bank-specific template must be added only after the merchant provides
 * a sanitized sample and validates its fields. Never guess bank formats.
 *
 * A template only needs to override the parts the generic parser gets wrong.
 * Any null pattern falls back to the generic parser for that field.
 * Capture group 1 of each pattern is the value.
 */
data class SmsTemplate(
    val bankCode: String,
    val senderIds: Set<String>,
    val successPhrase: Regex,
    val amountPattern: Regex,
    val referencePattern: Regex,
    val originPhonePattern: Regex? = null,
    val originBankPattern: Regex? = null
)

/** Approved templates. Empty on purpose until real, sanitized samples are validated. */
object SmsTemplates {
    @Volatile var registry: List<SmsTemplate> = emptyList()

    fun forSender(sender: String): List<SmsTemplate> =
        registry.filter { sender in it.senderIds }
}
