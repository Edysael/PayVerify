# PayVerify

PayVerify registra señales de pago estructuradas, las asocia con órdenes y permite conciliarlas contra extractos bancarios del comercio.

## Componentes
- Android: Kotlin, Jetpack Compose, Room, WorkManager y Supabase Auth por correo OTP.
- Backend: Supabase Auth, PostgreSQL/RLS y Edge Functions.
- Panel: Next.js, React y Supabase SSR.
- Conciliación: importación CSV, candidatos y confirmación auditada.

## Estado verificado (26 de noviembre de 2026)
- CI web, Android y SQL success: https://github.com/Edysael/PayVerify/actions/runs/45897110039
- APK debug artifact `15154955206`.
- Supabase PayVerify migrations 0001–0012 aplicadas; 14 Edge Functions activas; cron cada 5 minutos (migración 0012). Detalle en `docs/AUDITORIA_2026-11-26.md`.
- Hardening 0008 aplicado: 19 índices FK y políticas RLS de escritura sin SELECT redundante.
- Prueba SQL de producción con rollback pasó; no quedaron datos QA.
- Panel Vercel deployment READY desde commit de aplicación `826fba4`; alias https://payverify-nine.vercel.app apunta al deployment.

Consulta `docs/ESTADO_ACTUAL_2026-11-26.md`, `docs/PRODUCTION_VERIFICATION_2026-11-26.md` y `docs/PENDIENTES_ED.md`.

## Principios
- No guardar ni transmitir el cuerpo completo del SMS; no procesar historial.
- No recolectar OTP, PIN, contraseñas ni credenciales bancarias.
- SMS detectado no confirma pago ni fondos.
- `paid_confirmed` requiere conciliación con extracto y confirmación autorizada.
- No modificar APIs ni sistema contable externos.
- Supabase se comparte; PayVerify usa objetos `pv_*` y `payverify_*` con RLS.

## Estructura
- `android/` app Android.
- `web/` panel Next.js.
- `supabase/migrations/` migraciones.
- `supabase/functions/` backend.
- `docs/` arquitectura, seguridad, pruebas y despliegue.

## Criterio de lanzamiento
CI verde y deployment READY no equivalen a aceptación comercial. Antes de habilitar comercios reales deben completarse checkout, cartola bancaria y pruebas en teléfono Android físico; luego preparar APK release firmado.
