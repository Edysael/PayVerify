package com.legaltechit.payverify.security

import android.content.Context
import com.legaltechit.payverify.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class OrganizationOption(val id: String, val name: String)

object SupabaseMobileAuth {
    /**
     * La URL y la clave pública (publishable) de PayVerify vienen dentro de la app,
     * así el comercio no tiene que escribirlas. Solo se completan si están vacías,
     * para no pisar una configuración avanzada hecha por soporte.
     */
    fun ensureDefaults(context: Context) {
        if (SecureConfig.get(context, "supabase_url").isBlank()) SecureConfig.set(context, "supabase_url", BuildConfig.SUPABASE_URL)
        if (SecureConfig.get(context, "anon_key").isBlank()) SecureConfig.set(context, "anon_key", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
    }

    /** Ingreso con el mismo correo y contraseña del panel web. */
    fun signInWithPassword(context: Context, email: String, password: String) {
        ensureDefaults(context)
        val result = try {
            request(context, "/auth/v1/token?grant_type=password", JSONObject().put("email", email.trim()).put("password", password))
        } catch (e: IllegalStateException) {
            throw IllegalStateException("Correo o contraseña incorrectos.")
        }
        SecureConfig.set(context, "access_token", result.optString("access_token"))
        SecureConfig.set(context, "refresh_token", result.optString("refresh_token"))
    }

    /** Comercios a los que pertenece el usuario (la seguridad por fila de Supabase filtra el resto). */
    fun listOrganizations(context: Context): List<OrganizationOption> {
        val base = SecureConfig.get(context, "supabase_url").trimEnd('/')
        val key = SecureConfig.get(context, "anon_key")
        val token = SecureConfig.get(context, "access_token")
        require(token.isNotBlank()) { "Inicia sesión primero." }
        val connection = URL("$base/rest/v1/pv_organizations?select=id,name&order=name").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"; connection.connectTimeout = 15000; connection.readTimeout = 20000
            connection.setRequestProperty("apikey", key); connection.setRequestProperty("Authorization", "Bearer $token")
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) throw IllegalStateException("No se pudieron cargar tus comercios ($code).")
            val arr = JSONArray(text)
            return (0 until arr.length()).map { i -> arr.getJSONObject(i).let { OrganizationOption(it.getString("id"), it.optString("name", "Comercio")) } }
        } finally { connection.disconnect() }
    }

    private fun request(context:Context,path:String,body:JSONObject,authToken:String?=null):JSONObject {
        val base=SecureConfig.get(context,"supabase_url").trimEnd('/')
        val key=SecureConfig.get(context,"anon_key")
        require(base.startsWith("https://")&&key.isNotBlank()){"Supabase URL/key not configured"}
        val connection=URL("$base$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod="POST"; connection.connectTimeout=15000; connection.readTimeout=20000; connection.doOutput=true
            connection.setRequestProperty("Content-Type","application/json")
            connection.setRequestProperty("apikey",key)
            if(authToken!=null) connection.setRequestProperty("Authorization","Bearer $authToken")
            connection.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}
            val code=connection.responseCode
            val stream=if(code in 200..299) connection.inputStream else connection.errorStream
            val text=stream?.bufferedReader()?.use{it.readText()}.orEmpty()
            if(code !in 200..299) throw IllegalStateException("Supabase auth error ($code)")
            return JSONObject(text)
        } finally { connection.disconnect() }
    }

    fun testConnection(context:Context):String {
        val base=SecureConfig.get(context,"supabase_url").trimEnd('/')
        val key=SecureConfig.get(context,"anon_key")
        require(base.startsWith("https://")&&key.isNotBlank()){"Guarda primero la URL y la publishable key"}
        val connection=URL("$base/auth/v1/health").openConnection() as HttpURLConnection
        try {
            connection.requestMethod="GET"
            connection.connectTimeout=10000
            connection.readTimeout=10000
            connection.setRequestProperty("apikey",key)
            val code=connection.responseCode
            val stream=if(code in 200..299) connection.inputStream else connection.errorStream
            val text=stream?.bufferedReader()?.use{it.readText()}.orEmpty()
            if(code !in 200..299) throw IllegalStateException("Supabase no respondió correctamente ($code)")
            val version=JSONObject(text).optString("version").takeIf{it.isNotBlank()}
            return if(version!=null) "Conexión Supabase verificada (GoTrue $version)." else "Conexión Supabase verificada."
        } finally { connection.disconnect() }
    }

    fun requestEmailOtp(context:Context,email:String) {
        request(context,"/auth/v1/otp",JSONObject().put("email",email.trim()).put("create_user",false))
    }

    fun verifyEmailOtp(context:Context,email:String,code:String) {
        val result=request(context,"/auth/v1/verify",JSONObject().put("type","email").put("email",email.trim()).put("token",code.trim()))
        SecureConfig.set(context,"access_token",result.optString("access_token"))
        SecureConfig.set(context,"refresh_token",result.optString("refresh_token"))
    }

    fun refresh(context:Context):Boolean {
        val refreshToken=SecureConfig.get(context,"refresh_token")
        if(refreshToken.isBlank()) return false
        return try {
            val result=request(context,"/auth/v1/token?grant_type=refresh_token",JSONObject().put("refresh_token",refreshToken))
            SecureConfig.set(context,"access_token",result.optString("access_token"))
            SecureConfig.set(context,"refresh_token",result.optString("refresh_token",refreshToken))
            true
        } catch (_:Exception) { false }
    }

    fun enrollDevice(context:Context,organizationId:String,deviceName:String):String {
        val base=SecureConfig.get(context,"supabase_url").trimEnd('/')
        val key=SecureConfig.get(context,"anon_key")
        val token=SecureConfig.get(context,"access_token")
        val connection=URL("$base/functions/v1/device-enroll").openConnection() as HttpURLConnection
        try {
            connection.requestMethod="POST";connection.connectTimeout=15000;connection.readTimeout=20000;connection.doOutput=true
            connection.setRequestProperty("Content-Type","application/json")
            connection.setRequestProperty("apikey",key);connection.setRequestProperty("Authorization","Bearer $token")
            val body=JSONObject().put("organizationId",organizationId).put("deviceName",deviceName)
            connection.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}
            val code=connection.responseCode
            val stream=if(code in 200..299) connection.inputStream else connection.errorStream
            val text=stream?.bufferedReader()?.use{it.readText()}.orEmpty()
            if(code !in 200..299) throw IllegalStateException("Device enrollment failed ($code)")
            return JSONObject(text).getString("deviceId")
        } finally {connection.disconnect()}
    }
}
