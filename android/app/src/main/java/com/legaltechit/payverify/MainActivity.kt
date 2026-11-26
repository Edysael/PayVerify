package com.legaltechit.payverify

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.legaltechit.payverify.data.PayVerifyDatabaseProvider
import com.legaltechit.payverify.security.SecureConfig
import com.legaltechit.payverify.security.SupabaseMobileAuth
import com.legaltechit.payverify.sync.PaymentSyncScheduler

class MainActivity : ComponentActivity() {
    private val askSms = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val prefs = getSharedPreferences("payverify", MODE_PRIVATE)
        prefs.edit().putBoolean("sms_permission_granted", granted).apply()
        val configured = prefs.getStringSet("authorized_senders", emptySet())?.isNotEmpty() == true
        prefs.edit().putBoolean("capture_enabled", granted && configured).apply()
        recreate()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("payverify", MODE_PRIVATE)
        val permissionNow = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        prefs.edit().putBoolean("sms_permission_granted", permissionNow).apply()
        val allowedNow = prefs.getStringSet("authorized_senders", emptySet())?.toSet().orEmpty()
        setContent {
            MaterialTheme {
                var enabled by remember { mutableStateOf(prefs.getBoolean("capture_enabled", false)) }
                var permission by remember { mutableStateOf(ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED) }
                var sender by remember { mutableStateOf(allowedNow.firstOrNull { !it.startsWith("app:") }.orEmpty()) }
                var saved by remember { mutableStateOf(allowedNow.any { !it.startsWith("app:") }) }
                var appRules by remember { mutableStateOf(allowedNow.filter { it.startsWith("app:") }.toSet()) }
                var seenApps by remember { mutableStateOf(prefs.getStringSet("seen_packages", emptySet())?.toSet().orEmpty()) }
                var listenerEnabled by remember { mutableStateOf(NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)) }
                var unparsed by remember { mutableStateOf(prefs.getInt("unparsed_count", 0)) }
                var endpoint by remember { mutableStateOf(SecureConfig.get(this, "supabase_url")) }
                var anonKey by remember { mutableStateOf(SecureConfig.get(this, "anon_key")) }
                var orgId by remember { mutableStateOf(SecureConfig.get(this, "organization_id")) }
                var deviceId by remember { mutableStateOf(SecureConfig.get(this, "device_id")) }
                var email by remember { mutableStateOf("") }
                var otp by remember { mutableStateOf("") }
                var deviceName by remember { mutableStateOf("PayVerify Android") }
                var configMessage by remember { mutableStateOf("") }
                val localEventsFlow = remember { PayVerifyDatabaseProvider.get(this).paymentEventDao().observeAll() }
                val localEvents by localEventsFlow.collectAsState(initial = emptyList())
                Surface(Modifier.fillMaxSize()) {
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("PayVerify Mobile", style = MaterialTheme.typography.headlineMedium)
                        Text("Detección local de notificaciones de pago")
                        Text("Un SMS detectado no confirma por sí solo que los fondos estén disponibles.")
                        OutlinedTextField(value=sender,onValueChange={sender=it},label={Text("Remitente SMS autorizado exacto")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(onClick={
                            val clean=sender.trim()
                            if(clean.isNotEmpty() && clean.length<=80) {
                                val keepApps=(prefs.getStringSet("authorized_senders",emptySet()) ?: emptySet()).filter { it.startsWith("app:") }
                                prefs.edit().putStringSet("authorized_senders",keepApps.toSet()+clean).apply(); saved=true
                                appRules=keepApps.toSet()
                            } else saved=false
                        }) { Text("Guardar remitente") }
                        Text(if(saved) "Remitente guardado localmente" else "Guarda un remitente exacto antes de activar")
                        Button(onClick={
                            if(!permission) askSms.launch(Manifest.permission.RECEIVE_SMS)
                            else if(!saved) { enabled=false; prefs.edit().putBoolean("capture_enabled",false).apply() }
                            else { enabled=!enabled; prefs.edit().putBoolean("capture_enabled",enabled).apply() }
                        }) { Text(if(enabled) "Pausar captura" else if(!permission) "Conceder permiso y activar" else "Activar captura") }
                        Text(if(permission) "Permiso SMS concedido" else "Permiso SMS pendiente")
                        Divider()
                        Text("Notificaciones de las apps de los bancos", style=MaterialTheme.typography.titleMedium)
                        Text("Muchos bancos avisan por notificación y no por SMS. Concede el acceso a notificaciones y autoriza solo la app del banco donde recibes. Se lee en el teléfono y el texto no se guarda.")
                        Button(onClick={ startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }) { Text("Abrir acceso a notificaciones") }
                        Button(onClick={
                            listenerEnabled=NotificationManagerCompat.getEnabledListenerPackages(this@MainActivity).contains(packageName)
                            seenApps=prefs.getStringSet("seen_packages", emptySet())?.toSet().orEmpty()
                            unparsed=prefs.getInt("unparsed_count",0)
                        }) { Text("Actualizar estado") }
                        Text(if(listenerEnabled) "Acceso a notificaciones concedido" else "Acceso a notificaciones pendiente")
                        val candidates=seenApps.filter { "app:$it" !in appRules }
                        if(candidates.isNotEmpty()) {
                            Text("Apps que mostraron mensajes de dinero. Toca la de tu banco para autorizarla:")
                            candidates.forEach { pkg ->
                                OutlinedButton(onClick={
                                    val current=(prefs.getStringSet("authorized_senders",emptySet()) ?: emptySet()).toMutableSet()
                                    current.add("app:$pkg")
                                    prefs.edit().putStringSet("authorized_senders",current).apply()
                                    appRules=appRules+"app:$pkg"
                                }) { Text(pkg) }
                            }
                        }
                        if(appRules.isNotEmpty()) {
                            Text("Apps autorizadas (usa este mismo texto en Remitentes del panel web):")
                            appRules.forEach { rule ->
                                Row(verticalAlignment=androidx.compose.ui.Alignment.CenterVertically) {
                                    Text(rule, modifier=Modifier.weight(1f))
                                    TextButton(onClick={
                                        val current=(prefs.getStringSet("authorized_senders",emptySet()) ?: emptySet()).toMutableSet()
                                        current.remove(rule)
                                        prefs.edit().putStringSet("authorized_senders",current).apply()
                                        appRules=appRules-rule
                                    }) { Text("Quitar") }
                                }
                            }
                            Button(onClick={
                                enabled=!enabled
                                prefs.edit().putBoolean("capture_enabled",enabled).apply()
                            }) { Text(if(enabled) "Pausar captura" else "Activar captura solo con notificaciones") }
                        }
                        if(unparsed>0) Text("Mensajes de tus bancos que no se pudieron interpretar: $unparsed. Mándame uno (con datos tapados) para agregar su plantilla.")
                        Divider()
                        Text("Pagos detectados en este dispositivo", style=MaterialTheme.typography.titleMedium)
                        if(localEvents.isEmpty()) Text("Aún no hay notificaciones de pago guardadas.")
                        localEvents.take(20).forEach { event ->
                            Card(Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                                    Text("${event.amountMinorUnits / 100}.${(event.amountMinorUnits % 100).toString().padStart(2,'0')} ${event.currency}",style=MaterialTheme.typography.titleMedium)
                                    Text("Referencia: ${event.reference}")
                                    if(event.originBankCode!=null || event.originPhoneLast4!=null) Text("Origen: ${event.originBankCode ?: "banco ?"} / tel ...${event.originPhoneLast4 ?: "?"}")
                                    Text("Canal: ${if(event.channel=="notification") "Notificación de app" else "SMS"}")
                                    Text("Notificación: ${java.text.DateFormat.getDateTimeInstance().format(java.util.Date(event.transactionTimeMillis))}")
                                    Text("Sincronización: ${event.syncStatus}")
                                }
                            }
                        }
                        Divider()
                        Text("Conexión de piloto", style=MaterialTheme.typography.titleMedium)
                        Text("Configura estos datos desde un entorno de prueba. El token se cifra localmente; no compartas esta pantalla.")
                        OutlinedTextField(value=endpoint,onValueChange={endpoint=it},label={Text("URL Supabase")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        OutlinedTextField(value=anonKey,onValueChange={anonKey=it},label={Text("Anon / publishable key")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        OutlinedTextField(value=orgId,onValueChange={orgId=it},label={Text("Organization UUID")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(onClick={
                            val valid=endpoint.startsWith("https://") && anonKey.isNotBlank() && orgId.matches(Regex("(?i)[0-9a-f-]{36}"))
                            if(valid) {
                                val previousOrg=SecureConfig.get(this@MainActivity,"organization_id")
                                if(previousOrg.isNotBlank() && previousOrg!=orgId) {
                                    SecureConfig.set(this@MainActivity,"device_id","")
                                    deviceId=""
                                }
                                SecureConfig.set(this@MainActivity,"supabase_url",endpoint.trimEnd('/'))
                                SecureConfig.set(this@MainActivity,"anon_key",anonKey)
                                SecureConfig.set(this@MainActivity,"organization_id",orgId)
                                configMessage="Conexión base guardada."
                            } else configMessage="Revisa URL HTTPS, anon key y UUID de organización."
                        }) { Text("Guardar conexión") }
                        OutlinedTextField(value=email,onValueChange={email=it},label={Text("Correo de acceso")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(onClick={try { SupabaseMobileAuth.requestEmailOtp(this@MainActivity,email); configMessage="Código enviado al correo." } catch(e:Exception) { configMessage=e.message?: "No se pudo solicitar código." }}) { Text("Solicitar código de acceso") }
                        OutlinedTextField(value=otp,onValueChange={otp=it},label={Text("Código de un solo uso")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(onClick={try {
                            SupabaseMobileAuth.verifyEmailOtp(this@MainActivity,email,otp)
                            configMessage="Sesión iniciada de forma segura."
                        } catch(e:Exception) { configMessage=e.message?: "No se pudo validar el código." }}) { Text("Verificar código") }
                        OutlinedTextField(value=deviceName,onValueChange={deviceName=it},label={Text("Nombre del dispositivo")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(onClick={try {
                            if(SecureConfig.get(this@MainActivity,"access_token").isBlank()) throw IllegalStateException("Inicia sesión primero.")
                            deviceId=SupabaseMobileAuth.enrollDevice(this@MainActivity,orgId,deviceName)
                            SecureConfig.set(this@MainActivity,"device_id",deviceId)
                            configMessage="Dispositivo solicitado ($deviceId). Un administrador debe aprobarlo en el panel antes de sincronizar."
                        } catch(e:Exception) { configMessage=e.message?: "No se pudo solicitar el dispositivo." }}) { Text("Solicitar aprobación de dispositivo") }
                        Button(onClick={
                            PaymentSyncScheduler.schedule(this@MainActivity)
                            PaymentSyncScheduler.enqueueNow(this@MainActivity)
                            configMessage="Sincronización programada. El dispositivo debe estar aprobado."
                        }) { Text("Programar sincronización") }
                        Text("Dispositivo: ${SecureConfig.get(this@MainActivity,"device_id").ifBlank { "No enrolado" }}")
                        Text(configMessage)
                        Text("No se transmite el texto completo del SMS, OTP, PIN ni credenciales bancarias.")
                    }
                }
            }
        }
    }
}
