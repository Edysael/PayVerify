package com.legaltechit.payverify.sms

import org.junit.Assert.*
import org.junit.Test

class SmsValidationTest {
    @Test fun detectsOtpText() {
        assertTrue(SmsValidation.looksLikeAuthenticationMessage("Código de seguridad 123456"))
    }

    @Test fun normalizesSender() {
        assertEquals("BANK-INFO", SmsValidation.normalizeSender(" BANK-INFO "))
    }
}
