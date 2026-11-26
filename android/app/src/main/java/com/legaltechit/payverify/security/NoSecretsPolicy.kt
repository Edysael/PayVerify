package com.legaltechit.payverify.security

/**
 * Keep this as an explicit review checklist in code:
 * - no bank password/PIN/OTP
 * - no Supabase service-role key in Android
 * - no full SMS body in analytics, logs, or API payload
 * - device credentials are revocable and scoped
 */
object NoSecretsPolicy {
    const val CLIENT_MUST_NOT_CONTAIN_SERVICE_ROLE = true
    const val SMS_BODY_MUST_NOT_BE_UPLOADED = true
    const val BANK_CREDENTIALS_MUST_NOT_BE_COLLECTED = true
}
