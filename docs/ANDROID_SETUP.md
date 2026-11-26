# Android — configuración de piloto

## Requisitos
Android Studio, Android SDK API 35, JDK compatible con Android Gradle Plugin 8.7.3 y Kotlin 2.0.21. Abre la carpeta `android/` en Android Studio y deja que sincronice Gradle.

## Primer uso
1. En el panel web crea una organización.
2. En Android configura URL Supabase, anon/publishable key y UUID de la organización; guarda conexión.
3. Solicita código de acceso al correo y verifica OTP.
4. Solicita enrolamiento del dispositivo.
5. En panel > Dispositivos, un owner/admin aprueba el dispositivo.
6. En panel > Remitentes SMS, agrega y habilita el sender exacto del banco.
7. En Android agrega el mismo remitente exacto, concede RECEIVE_SMS y activa captura.
8. Envía un SMS de prueba controlado y revisa sincronización.

## Seguridad
La app usa EncryptedSharedPreferences para tokens de sesión. No uses service role key. Si la sesión se invalida, inicia sesión nuevamente. No configures remitentes de bancos que no hayas verificado.

## Distribución
Google Play restringe permisos SMS. Esta app debe pasar revisión de políticas antes de publicarse; no asumas que RECEIVE_SMS será aprobado. Para piloto, usa instalación privada en dispositivos controlados y consentimiento explícito.
