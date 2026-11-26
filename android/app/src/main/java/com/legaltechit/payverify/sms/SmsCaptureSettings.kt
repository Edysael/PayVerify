package com.legaltechit.payverify.sms

import android.content.Context

class SmsCaptureSettings(context: Context) {
    private val prefs = context.getSharedPreferences("payverify_capture", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) { prefs.edit().putBoolean("enabled", value).apply() }

    fun authorizedSenders(): Set<String> =
        prefs.getStringSet("authorized_senders", emptySet())?.toSet() ?: emptySet()

    fun replaceAuthorizedSenders(senders: Set<String>) {
        prefs.edit().putStringSet("authorized_senders", senders.map { it.trim() }.filter { it.isNotBlank() }.toSet()).apply()
    }
}
