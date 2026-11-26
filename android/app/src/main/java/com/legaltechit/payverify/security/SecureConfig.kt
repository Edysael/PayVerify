package com.legaltechit.payverify.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Stores pilot credentials encrypted at rest. Access tokens are short-lived and
 * must be refreshed by re-authenticating; this is not a production enrollment flow.
 */
object SecureConfig {
    private const val FILE = "payverify_secure"
    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        FILE,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun get(context: Context, key: String): String = prefs(context).getString(key, "").orEmpty()
    fun set(context: Context, key: String, value: String) {
        prefs(context).edit().putString(key, value.trim()).apply()
    }
    fun clearSession(context: Context) {
        prefs(context).edit().remove("access_token").remove("refresh_token").apply()
    }
}
