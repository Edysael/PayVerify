# PayVerify

PayVerify es un producto para registrar localmente notificaciones de pago, sincronizar datos estructurados y conciliar movimientos contra extractos entregados por el comercio.

## Componentes
- Android: Kotlin, Jetpack Compose, Room, WorkManager y sesión Supabase Auth por correo OTP.
- Backend: Supabase Auth, PostgreSQL/RLS y Edge Functions.
- Panel: Next.js, React y Supabase SSR.
- Conciliación: importación CSV, candidatos exactos y confirmación manual auditada.

## Estado verificado (26 de noviembre de 2026)
- Repositorio privado: `Edysael/PayVerify`.
- CI actual: https://github.com/Edysael/PayVerify/actions/runs/45896340341 — web, Android debug y SQL pasan.
- Supabase PayVerify migraciones 0001–0008 aplicadas; 13 Edge Functions activas; cron de expiración cada 5 minutos.
- Hardening 0008 aplicado: índices FK y políticas RLS de escritura sin SELECT redundante.
- Panel Vercel producción: https://payverify-nine.vercel.app.

Consulta `docs/ESTADO_ACTUAL_2026-11-26.md` y `docs/PENDIENTES_ED.md` para el estado y los gates de aceptación.

## Principios obligatorios
- No guardar ni transmitir el cuerpo completo del SMS.
- No procesar historial de SMS.
- No recolectar OTP, PIN, contraseñas ni credenciales bancarias.
- SMS detectado no significa pago confirmado ni fondos disponibles.
- Conciliación solo contra extracto/movimiento y confirmación de usuario autorizado.
- No modificar APIs ni sistema contable externos.
- Supabase se comparte con otras aplicaciones; PayVerify usa objetos `pv_*` y `payverify_*` con RLS. La service role se usa solo en Edge Functions.

## Estructura
- `android/` aplicación Android.
- `web/` panel Next.js.
- `supabase/migrations/` migraciones SQL.
- `supabase/functions/` funciones backend.
- `docs/` arquitectura, seguridad, pruebas y despliegue.

## Criterio de lanzamiento
CI verde no equivale a aceptación comercial. Antes de habilitar comercios reales deben completarse checkout, conciliación con cartola y pruebas en teléfono Android físico; luego preparar APK release firmado.
