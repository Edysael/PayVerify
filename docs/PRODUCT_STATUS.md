# Estado de PayVerify

## Implementado en el repositorio y validado por CI

- Android Kotlin/Compose, Room, WorkManager, OTP, configuración Supabase, enrolamiento y aprobación de dispositivos.
- Captura SMS opt-in y notificaciones de apps bancarias autorizadas; parser, reglas locales, deduplicación y sincronización.
- Panel Next.js con organizaciones, pagos, dispositivos, remitentes, órdenes, API keys, importación/exportación CSV y conciliación.
- Supabase Auth, PostgreSQL/RLS multiempresa, auditoría, funciones Edge, órdenes, cruce y conciliación.
- Pruebas automatizadas web, Android y SQL.
- CI actual: https://github.com/Edysael/PayVerify/actions/runs/45896340341 — web, Android y SQL: success.
- Migración 0008 aplicada a producción: índices FK y políticas de escritura RLS sin SELECT duplicado.
- `device-approve` y `device-revoke` en producción versión 2 y coincidentes con el repositorio.

## Infraestructura instalada

- Supabase: migraciones 0001–0008, 13 Edge Functions activas y cron de expiración cada 5 minutos.
- Vercel: proyecto `payverify`, producción `READY`, alias https://payverify-nine.vercel.app.
- No se detectaron errores runtime en Vercel durante los últimos 7 días.
- El deployment de producción debe verificarse contra el commit actual de GitHub; el proyecto no tiene despliegue automático enlazado al repositorio.

## Estado de aceptación

**No certificado para lanzamiento comercial.** Producción tiene 2 organizaciones y 2 API keys activas, pero no tiene órdenes, eventos de pago ni líneas de extracto. Aún faltan pruebas de checkout real, conciliación con cartola y aceptación Android en dispositivo físico.

## Reglas obligatorias

- No almacenar ni transmitir el cuerpo completo del SMS.
- No procesar historial SMS.
- No recolectar OTP, PIN, contraseñas ni credenciales bancarias.
- SMS/notificación detectado no confirma fondos.
- `paid_confirmed` requiere conciliación con extracto y acción autorizada.
- No modificar APIs ni sistema contable externos.
- PayVerify usa objetos `pv_*` y `payverify_*` dentro del proyecto Supabase compartido.
