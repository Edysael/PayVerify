package com.legaltechit.payverify.sms

import android.content.Context

class SmsCaptureSettings(context: Context) {
    private val prefs = context.getSharedPreferences("payverify", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("capture_enabled", false)
        set(value) { prefs.edit().putBoolean("capture_enabled", value).apply() }

    fun authorizedSenders(): Set<String> =
        prefs.getStringSet("authorized_senders", emptySet())?.toSet() ?: emptySet()

    fun replaceAuthorizedSenders(senders: Set<String>) {
        prefs.edit().putStringSet("authorized_senders", senders.map { it.trim() }.filter { it.isNotBlank() }.toSet()).apply()
    }
}
