package com.legaltechit.payverify.sms

/**
 * Venezuelan bank codes (4 digits, the ones used in Pago Móvil) and the names
 * people see in messages. Used only as a HINT for the origin bank of a payment.
 * Verify the list against the current official table before relying on it.
 */
object BankDirectory {
    val names: Map<String, String> = linkedMapOf(
        "0102" to "Banco de Venezuela",
        "0104" to "Venezolano de Crédito",
        "0105" to "Mercantil",
        "0108" to "Provincial",
        "0114" to "Bancaribe",
        "0115" to "Exterior",
        "0128" to "Banco Caroní",
        "0134" to "Banesco",
        "0137" to "Sofitasa",
        "0138" to "Banco Plaza",
        "0146" to "Bangente",
        "0151" to "BFC Banco Fondo Común",
        "0156" to "100% Banco",
        "0157" to "Del Sur",
        "0163" to "Banco del Tesoro",
        "0166" to "Banco Agrícola de Venezuela",
        "0168" to "Bancrecer",
        "0169" to "Mi Banco",
        "0171" to "Banco Activo",
        "0172" to "Bancamiga",
        "0173" to "Banco Internacional de Desarrollo",
        "0174" to "Banplus",
        "0175" to "Bicentenario",
        "0177" to "Banfanb",
        "0191" to "BNC",
    )

    // keyword (lowercase, no accents) -> code
    private val keywords: List<Pair<Regex, String>> = listOf(
        Regex("banco\\s+de\\s+venezuela|\\bbdv\\b") to "0102",
        Regex("venezolano\\s+de\\s+cr[eé]dito") to "0104",
        Regex("mercantil") to "0105",
        Regex("provincial|bbva") to "0108",
        Regex("bancaribe") to "0114",
        Regex("\\bexterior\\b") to "0115",
        Regex("caron[ií]") to "0128",
        Regex("banesco") to "0134",
        Regex("sofitasa") to "0137",
        Regex("banco\\s+plaza|\\bplaza\\b") to "0138",
        Regex("bangente") to "0146",
        Regex("\\bbfc\\b|fondo\\s+com[uú]n") to "0151",
        Regex("100\\s*%\\s*banco") to "0156",
        Regex("del\\s+sur") to "0157",
        Regex("del\\s+tesoro") to "0163",
        Regex("agr[ií]cola") to "0166",
        Regex("bancrecer") to "0168",
        Regex("mi\\s+banco") to "0169",
        Regex("banco\\s+activo") to "0171",
        Regex("bancamiga") to "0172",
        Regex("banplus") to "0174",
        Regex("bicentenario") to "0175",
        Regex("banfanb") to "0177",
        Regex("\\bbnc\\b|nacional\\s+de\\s+cr[eé]dito") to "0191",
    )

    fun isKnownCode(code: String) = names.containsKey(code)

    /** Returns the bank whose keyword appears FIRST in the text. */
    fun codeForKeyword(text: String): String? {
        val t = text.lowercase()
        return keywords
            .mapNotNull { (rx, code) -> rx.find(t)?.let { it.range.first to code } }
            .minByOrNull { it.first }?.second
    }
}
