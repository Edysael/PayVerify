# Estado de PayVerify

## Implementado en código en esta entrega
- Captura SMS con opt-in, permiso y remitente exacto.
- Parser local de pago, rechazo de OTP/token y normalización de montos con separadores comunes.
- Persistencia Room y clave idempotente basada en remitente, monto, referencia y timestamp del SMS.
- Sesión móvil por email OTP, almacenamiento cifrado de tokens, enrolamiento y aprobación de dispositivos.
- Worker WorkManager con sincronización, manejo de respuestas, refresh token y reintentos.
- Supabase Auth, esquema multiempresa, RLS y Edge Functions para organización, dispositivos, ingestión, importación y conciliación.
- Panel web con selector de organización, métricas, pagos, dispositivos y remitentes autorizados.
- CSV parser con preview, límites, sanitización y hash de archivo.
- Conciliación/deshacer mediante RPC SQL transaccional con validación y auditoría.
- Tests unitarios Android y web definidos para reglas críticas.

## No verificado / requiere ambiente externo
- Build Android y APK.
- Build Next.js y Vitest con dependencias instaladas.
- Aplicación de migraciones en Supabase staging.
- Deploy de Edge Functions.
- Pruebas de RLS con organizaciones/roles distintos.
- Pruebas en teléfono físico y SMS bancarios reales sanitizados.
- Pruebas de importación con extractos reales anonimizados.
- Pentest, revisión legal y política de distribución SMS.
- Deploy Vercel, dominio, HTTPS y APK firmado.

## Restricciones
No se modificaron APIs existentes ni sistema contable. La aplicación no consulta APIs bancarias. El SMS solo origina una notificación; no prueba saldo ni fondos. La conciliación requiere movimiento de extracto y confirmación autorizada.


## Fase 7 (órdenes y notificaciones)
Implementado y probado en base de datos real: órdenes, cruce automático, llaves de API, confirmación por extracto. Implementado y probado en parte: parser. Escrito pero **sin compilar/desplegar**: servicio de notificaciones Android, Edge Functions nuevas. Ver `VALIDATION_REPORT.md` y `PHASE_07_ORDENES_Y_NOTIFICACIONES.md`.
