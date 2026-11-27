package com.legaltechit.payverify.sms
import org.junit.Assert.*
import org.junit.Test
class PaymentSmsParserTest {
 @Test fun parsesTestMessage() { val r=PaymentSmsParser.parse("TESTBANK","Pago recibido Bs 125,50 referencia: ABCD1234",setOf("TESTBANK")); assertTrue(r is ParseResult.Success); assertEquals("ABCD1234",(r as ParseResult.Success).payment.reference) }
 @Test fun parsesReferenceWithBankSeparators() { val r=PaymentSmsParser.parse("TESTBANK","Pago recibido Bs 125 referencia: AB-12/CD_34",setOf("TESTBANK")); assertTrue(r is ParseResult.Success); assertEquals("AB-12/CD_34",(r as ParseResult.Success).payment.reference) }
 @Test fun rejectsOtherSender() { assertTrue(PaymentSmsParser.parse("UNKNOWN","Pago recibido Bs 125 referencia: ABCD1234",setOf("TESTBANK")) is ParseResult.Rejected) }
 @Test fun rejectsOtp() { assertTrue(PaymentSmsParser.parse("TESTBANK","Código de seguridad 123456",setOf("TESTBANK")) is ParseResult.Rejected) }
 @Test fun parsesVenezuelanThousandsAndDecimal() {
  val r=PaymentSmsParser.parse("TESTBANK","Pago recibido Bs 1.250,50 referencia: ABCD1234",setOf("TESTBANK"))
  assertTrue(r is ParseResult.Success)
  assertEquals(java.math.BigDecimal("1250.50"),(r as ParseResult.Success).payment.amount)
 }
 @Test fun parsesThousandsWithoutDecimal() {
  val r=PaymentSmsParser.parse("TESTBANK","Pago recibido Bs 1.250 referencia: ABCD1234",setOf("TESTBANK"))
  assertTrue(r is ParseResult.Success)
  assertEquals(java.math.BigDecimal("1250"),(r as ParseResult.Success).payment.amount)
 }
}

// Mensajes SINTÉTICOS de prueba. No representan formatos reales de ningún banco.
class PaymentSmsParserExtendedTest {
 private val S="TESTBANK"
 private fun ok(b:String)=(PaymentSmsParser.parse(S,b,setOf(S)) as? ParseResult.Success)?.payment
 private fun rej(b:String)=PaymentSmsParser.parse(S,b,setOf(S)) is ParseResult.Rejected
 @Test fun trailingDotDoesNotBreakAmount() { assertEquals(java.math.BigDecimal("702.75"), ok("Recibiste Bs. 702,75 de 0412-5559812 Ref: 849201.")?.amount) }
 @Test fun extractsFullPhone() { val p=ok("Recibiste Bs. 702,75 de 0412-5559812 Ref: 849201.")!!; assertEquals("04125559812",p.originPhone); assertEquals("9812",p.originPhoneLast4) }
 @Test fun extractsMaskedPhoneLast4() { val p=ok("Recibiste Bs. 702,75 de 0412-***9812 Ref: 849201.")!!; assertNull(p.originPhone); assertEquals("9812",p.originPhoneLast4) }
 @Test fun receiverBankAtStartIsNotOrigin() { assertNull(ok("Banesco PagoMovil: Recibiste Bs. 702,75 Ref: 849201.")?.originBankCode) }
 @Test fun originBankByName() { assertEquals("0105",ok("Recibiste Bs 1.250,50 desde Banco Mercantil Ref 123456789")?.originBankCode) }
 @Test fun originBankByCode() { assertEquals("0134",ok("Recibiste Bs 50,00 del banco 0134 Ref 55512")?.originBankCode) }
 @Test fun rejectsOutgoing() { assertTrue(rej("Enviaste Bs 100,00 Ref 123456")); assertTrue(rej("Debito por Bs 100,00 Ref 123456")) }
 @Test fun rejectsReferenceWithoutDigits() { assertTrue(rej("Recibiste Bs 100,00 Referencia: Pago")) }
 @Test fun templateOverridesGenericParser() {
  SmsTemplates.registry=listOf(SmsTemplate("9999",setOf("TPL"),Regex("INGRESO"),Regex("MONTO=([0-9.,]+)"),Regex("OP=([0-9]+)"),Regex("TEL=([0-9]+)"),Regex("BCO=([0-9]{4})")))
  try {
   val p=(PaymentSmsParser.parse("TPL","INGRESO MONTO=10,00 OP=998877 TEL=04141112233 BCO=0105",setOf("TPL")) as ParseResult.Success).payment
   assertEquals("998877",p.reference); assertEquals("0105",p.originBankCode)
  } finally { SmsTemplates.registry=emptyList() }
 }
}
