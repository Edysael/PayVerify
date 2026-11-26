package com.legaltechit.payverify.data

import org.junit.Assert.*
import org.junit.Test

class PaymentLocalRulesTest {
    @Test fun acceptsValidReference() {
        assertTrue(PaymentLocalRules.validReference("A-1234/XYZ"))
    }
    @Test fun rejectsEmptyAndLongReference() {
        assertFalse(PaymentLocalRules.validReference(" "))
        assertFalse(PaymentLocalRules.validReference("X".repeat(65)))
    }
    @Test fun acceptsPositiveMinorUnitsOnly() {
        assertTrue(PaymentLocalRules.validAmount(1))
        assertFalse(PaymentLocalRules.validAmount(0))
        assertFalse(PaymentLocalRules.validAmount(-10))
    }
    @Test fun statusLabelsAreExplicit() {
        assertEquals("Recibido por el servidor", PaymentLocalRules.userFacingStatus("RECEIVED_BY_SERVER"))
        assertEquals("Estado desconocido", PaymentLocalRules.userFacingStatus("BANK_CONFIRMED"))
    }
}
