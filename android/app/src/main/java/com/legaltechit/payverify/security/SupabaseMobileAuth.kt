package com.legaltechit.payverify.security

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object SupabaseMobileAuth {
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
