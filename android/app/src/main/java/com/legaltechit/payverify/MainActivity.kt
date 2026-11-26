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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
                val scope = rememberCoroutineScope()
                var configMessage by remember { mutableStateOf("") }
                var senderMessage by remember { mutableStateOf("") }
                var captureMessage by remember { mutableStateOf("") }
                var appMessage by remember { mutableStateOf("") }
                var authMessage by remember { mutableStateOf("") }
                var deviceMessage by remember { mutableStateOf("") }
                var syncMessage by remember { mutableStateOf("") }
                var authBusy by remember { mutableStateOf(false) }
                var deviceBusy by remember { mutableStateOf(false) }
                var syncBusy by remember { mutableStateOf(false) }
                var connectionBusy by remember { mutableStateOf(false) }
                var connectionTestMessage by remember { mutableStateOf("") }
                var statusMessage by remember { mutableStateOf("") }
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
                                appRules=keepApps.toSet(); senderMessage="Remitente guardado en este teléfono."
                            } else { saved=false; senderMessage="No se guardó: escribe el remitente exacto (máximo 80 caracteres)." }
                        }) { Text("Guardar remitente") }
                        Text(if(saved) "Remitente guardado localmente" else "Guarda un remitente exacto antes de activar")
                        if(senderMessage.isNotBlank()) Text(senderMessage)
                        Button(onClick={
                            if(!permission) { captureMessage="Solicitando permiso SMS…"; askSms.launch(Manifest.permission.RECEIVE_SMS) }
                            else if(!saved) { enabled=false; prefs.edit().putBoolean("capture_enabled",false).apply(); captureMessage="Primero guarda un remitente SMS autorizado." }
                            else { enabled=!enabled; prefs.edit().putBoolean("capture_enabled",enabled).apply(); captureMessage=if(enabled) "Captura SMS activada." else "Captura SMS pausada." }
                        }) { Text(if(enabled) "Pausar captura" else if(!permission) "Conceder permiso y activar" else "Activar captura") }
                        Text(if(permission) "Permiso SMS concedido" else "Permiso SMS pendiente")
                        if(captureMessage.isNotBlank()) Text(captureMessage)
                        Divider()
                        Text("Notificaciones de las apps de los bancos", style=MaterialTheme.typography.titleMedium)
                        Text("Muchos bancos avisan por notificación y no por SMS. Concede el acceso a notificaciones y autoriza solo la app del banco donde recibes. Se lee en el teléfono y el texto no se guarda.")
                        Button(onClick={ statusMessage="Activa PayVerify en la pantalla de acceso a notificaciones y vuelve para pulsar Actualizar estado."; startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }) { Text("Abrir acceso a notificaciones") }
                        Button(onClick={
                            permission=ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
                            val currentSenders=prefs.getStringSet("authorized_senders", emptySet())?.toSet().orEmpty()
                            sender=currentSenders.firstOrNull { !it.startsWith("app:") }.orEmpty()
                            saved=currentSenders.any { !it.startsWith("app:") }
                            enabled=prefs.getBoolean("capture_enabled", false)
                            appRules=currentSenders.filter { it.startsWith("app:") }.toSet()
                            seenApps=prefs.getStringSet("seen_packages", emptySet())?.toSet().orEmpty()
                            listenerEnabled=NotificationManagerCompat.getEnabledListenerPackages(this@MainActivity).contains(packageName)
                            unparsed=prefs.getInt("unparsed_count",0)
                            statusMessage="Estado actualizado."
                        }) { Text("Actualizar estado") }
                        if(statusMessage.isNotBlank()) Text(statusMessage)
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
                                if(!listenerEnabled) {
                                    appMessage="Primero concede el acceso a notificaciones a PayVerify."
                                    startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                                } else if(appRules.isEmpty()) appMessage="Autoriza primero la app de tu banco."
                                else {
                                    enabled=!enabled
                                    prefs.edit().putBoolean("capture_enabled",enabled).apply()
                                    appMessage=if(enabled) "Captura de notificaciones activada." else "Captura pausada."
                                }
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
                            configMessage="Validando datos..."
                            try {
                                val cleanUrl=endpoint.trim().trimEnd('/')
                                val cleanKey=anonKey.trim()
                                val cleanOrg=orgId.trim()
                                val uuidPattern=Regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
                                val valid=cleanUrl.startsWith("https://") && cleanKey.isNotBlank() && uuidPattern.matches(cleanOrg)
                                if(valid) {
                                    val previousOrg=SecureConfig.get(this@MainActivity,"organization_id")
                                    if(previousOrg.isNotBlank() && previousOrg!=cleanOrg) {
                                        SecureConfig.set(this@MainActivity,"device_id","")
                                        deviceId=""
                                    }
                                    SecureConfig.set(this@MainActivity,"supabase_url",cleanUrl)
                                    SecureConfig.set(this@MainActivity,"anon_key",cleanKey)
                                    SecureConfig.set(this@MainActivity,"organization_id",cleanOrg)
                                    configMessage="Configuración guardada localmente; todavía no se probó la conexión."
                                } else {
                                    configMessage="No se guardó: revisa URL HTTPS, anon key y UUID completo."
                                }
                            } catch(e:Exception) {
                                configMessage="Error al guardar: ${e.message ?: "fallo de almacenamiento"}"
                            }
                        }) { Text("Guardar conexión") }
                        Text(configMessage, style=MaterialTheme.typography.bodyMedium)
                        Button(enabled=!connectionBusy,onClick={
                            connectionBusy=true; connectionTestMessage="Comprobando conexión con Supabase…"
                            scope.launch {
                                try { connectionTestMessage=withContext(Dispatchers.IO) { SupabaseMobileAuth.testConnection(this@MainActivity) } }
                                catch(e:Exception) { connectionTestMessage=e.message?: "No se pudo comprobar la conexión." }
                                finally { connectionBusy=false }
                            }
                        }) { Text(if(connectionBusy) "Comprobando…" else "Probar conexión") }
                        if(connectionTestMessage.isNotBlank()) Text(connectionTestMessage)
                        OutlinedTextField(value=email,onValueChange={email=it},label={Text("Correo de acceso")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(enabled=!authBusy,onClick={
                            if(email.trim().isBlank()) authMessage="Escribe el correo de acceso."
                            else scope.launch {
                                authBusy=true; authMessage="Solicitando código…"
                                try { withContext(Dispatchers.IO) { SupabaseMobileAuth.requestEmailOtp(this@MainActivity,email) }; authMessage="Solicitud aceptada. Revisa tu correo."
                                } catch(e:Exception) { authMessage=e.message?: "No se pudo solicitar código." }
                                finally { authBusy=false }
                            }
                        }) { Text(if(authBusy) "Procesando…" else "Solicitar código de acceso") }
                        if(authMessage.isNotBlank()) Text(authMessage)
                        OutlinedTextField(value=otp,onValueChange={otp=it},label={Text("Código de un solo uso")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(enabled=!authBusy,onClick={
                            if(email.trim().isBlank() || otp.trim().isBlank()) authMessage="Escribe el correo y el código recibido."
                            else scope.launch {
                                authBusy=true; authMessage="Verificando código…"
                                try { withContext(Dispatchers.IO) { SupabaseMobileAuth.verifyEmailOtp(this@MainActivity,email,otp) }; authMessage="Sesión iniciada de forma segura."; otp=""
                                } catch(e:Exception) { authMessage=e.message?: "No se pudo validar el código." }
                                finally { authBusy=false }
                            }
                        }) { Text(if(authBusy) "Verificando…" else "Verificar código") }
                        if(authMessage.isNotBlank()) Text(authMessage)
                        OutlinedTextField(value=deviceName,onValueChange={deviceName=it},label={Text("Nombre del dispositivo")},singleLine=true,modifier=Modifier.fillMaxWidth())
                        Button(enabled=!deviceBusy,onClick={
                            if(SecureConfig.get(this@MainActivity,"access_token").isBlank()) deviceMessage="Inicia sesión primero."
                            else if(orgId.trim()!=SecureConfig.get(this@MainActivity,"organization_id")) deviceMessage="Guarda primero la conexión con el UUID de esta organización."
                            else if(deviceName.trim().isBlank()) deviceMessage="Escribe un nombre para el dispositivo."
                            else scope.launch {
                                deviceBusy=true; deviceMessage="Solicitando enrolamiento…"
                                try {
                                    val enrolled=withContext(Dispatchers.IO) { SupabaseMobileAuth.enrollDevice(this@MainActivity,orgId.trim(),deviceName.trim()) }
                                    deviceId=enrolled; SecureConfig.set(this@MainActivity,"device_id",deviceId)
                                    deviceMessage="Solicitud enviada ($deviceId). Falta aprobación del administrador."
                                } catch(e:Exception) { deviceMessage=e.message?: "No se pudo solicitar el dispositivo." }
                                finally { deviceBusy=false }
                            }
                        }) { Text(if(deviceBusy) "Solicitando…" else "Solicitar aprobación de dispositivo") }
                        if(deviceMessage.isNotBlank()) Text(deviceMessage)
                        Button(enabled=!syncBusy,onClick={
                            syncBusy=true; syncMessage="Solicitando sincronización…"
                            try {
                                PaymentSyncScheduler.schedule(this@MainActivity)
                                PaymentSyncScheduler.enqueueNow(this@MainActivity)
                                syncMessage="Trabajo de sincronización enviado a WorkManager. Requiere conexión y dispositivo aprobado."
                            } catch(e:Exception) { syncMessage=e.message?: "No se pudo programar la sincronización." }
                            finally { syncBusy=false }
                        }) { Text(if(syncBusy) "Programando…" else "Programar sincronización") }
                        if(syncMessage.isNotBlank()) Text(syncMessage)
                        Text("Dispositivo: ${SecureConfig.get(this@MainActivity,"device_id").ifBlank { "No enrolado" }}")
                        Text("No se transmite el texto completo del SMS, OTP, PIN ni credenciales bancarias.")
                    }
                }
            }
        }
    }
}
