# PayVerify — integración de las seis fases

Esta entrega integra en el repositorio los seis bloques de trabajo solicitados. El código se ha preparado localmente; los pasos que requieren credenciales, despliegue remoto, SDK instalado o dispositivo físico quedan identificados como validación externa, no como completados en producción.

## Fase 1 — Android y captura local
Implementado en código:
- Opt-in, permiso RECEIVE_SMS y remitente exacto permitido.
- Parseo local de notificaciones de pago; rechaza mensajes OTP/token.
- Room para persistencia local.
- Identificador idempotente estable con timestamp del SMS.
- Configuración de conexión y sesión Supabase almacenada mediante EncryptedSharedPreferences.
- Login por correo OTP, enrolamiento de dispositivo y solicitud de aprobación.
- Worker WorkManager con conectividad, lotes, reintentos y actualización de estado local.

Pendiente de validación: build Gradle, prueba en teléfono real y plantilla aprobada por cada banco.

## Fase 2 — Backend y base de datos
Implementado en código:
- Esquema multiempresa, roles, dispositivos, pagos y auditoría.
- Ingesta autenticada con validación de usuario, organización, dispositivo activo, remitente autorizado, monto, referencia e idempotencia.
- Edge Functions para crear organización, enrolar/aprobar/revocar dispositivos.
- Migraciones de integridad y funciones SQL de conciliación transaccional.
- RLS de lectura y políticas de operación por rol.

Pendiente: aplicar migraciones en un proyecto Supabase dedicado y probar RLS con cuentas de roles distintos.

## Fase 3 — Panel web
Implementado en código:
- Inicio de sesión por enlace/código de correo.
- Selector de organización que no elige arbitrariamente entre varias.
- Dashboard con conteos reales.
- Lista de pagos.
- Gestión de dispositivos y aprobación/revocación.
- Configuración de remitentes SMS.

Pendiente: instalar dependencias, ejecutar build y probar UI con datos de staging.

## Fase 4 — Extractos y conciliación
Implementado en código:
- CSV parser con comillas, vista previa, límites y validación.
- Hash SHA-256 para evitar reimportar el mismo archivo.
- Edge Function de importación y fingerprints de líneas.
- Motor de candidatos por monto positivo, moneda, referencia y ventana temporal.
- Confirmación manual por usuario autorizado.
- RPC SQL atómica y auditada para conciliar/deshacer.
- Exportador CSV previo con sanitización de fórmulas.

Pendiente: pruebas con extractos reales anonimizados de cada banco. XLSX no está incluido en esta entrega.

## Fase 5 — Seguridad y privacidad
Implementado en código:
- No se envía ni almacena el cuerpo SMS.
- OTP/PIN/token rechazados por parser.
- Token de sesión almacenado cifrado en Android.
- RLS multiempresa y permisos por rol.
- Aprobación y revocación de dispositivos.
- Idempotencia, validación de payload y auditoría.
- Conciliación no automática; SMS no se etiqueta como confirmación bancaria.

Pendiente: threat model, pentest, revisión legal de privacidad y validación de políticas de Google Play/SMS.

## Fase 6 — Despliegue y liberación
Preparado:
- Documentación de variables, migraciones, Edge Functions y orden de despliegue.
- Health endpoint web.
- Checklist de staging, build, pruebas y release.

No ejecutado: no se desplegó Supabase/Vercel ni se generó APK firmado. Requiere proyecto y credenciales del propietario, configuración de dominios/secrets, Android SDK/JDK y pruebas de aceptación.
