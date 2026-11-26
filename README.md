# PayVerify

PayVerify es un producto independiente para registrar localmente notificaciones de pago, sincronizar datos estructurados y conciliar movimientos contra extractos entregados por el comercio.

## Componentes
- Android: Kotlin, Jetpack Compose, Room, WorkManager y sesión Supabase Auth por correo OTP.
- Backend: Supabase Auth, PostgreSQL/RLS y Edge Functions.
- Panel: Next.js, React y Supabase SSR.
- Conciliación: importación CSV, candidatos exactos y confirmación manual auditada.

## Estado
El panel está publicado y el backend PayVerify está instalado en el proyecto Supabase compartido `LEGAL TECH-IT API SERVICES`, usando objetos con prefijo `pv_` y tablas `payverify_*`. Las 13 Edge Functions están activas y el vencimiento automático está programado cada 5 minutos. Consulta `docs/ESTADO_ACTUAL_2026-11-26.md` para la auditoría y los límites aún no certificados. La integración de órdenes y el APK todavía requieren una prueba real de aceptación.

## Principios obligatorios
- No guardar ni transmitir el cuerpo completo del SMS.
- No procesar historial de SMS.
- No recolectar OTP, PIN, contraseñas ni credenciales bancarias.
- SMS detectado no significa pago confirmado ni fondos disponibles.
- Conciliación solo contra extracto/movimiento y confirmación de usuario autorizado.
- No modificar APIs ni sistema contable externos.
- En la instalación actual, Supabase se comparte con otras aplicaciones; PayVerify usa únicamente objetos `pv_*` y `payverify_*` con RLS. La service role se usa solo en Edge Functions.

## Estructura
- `android/` aplicación Android.
- `web/` panel Next.js.
- `supabase/migrations/` migraciones SQL.
- `supabase/functions/` funciones backend.
- `docs/` arquitectura, seguridad, pruebas y despliegue.

## Próximo paso
Configura Supabase de staging y sigue el checklist de `docs/DEPLOYMENT.md`. No habilites captura con usuarios reales hasta pasar los gates de seguridad y aceptación.

## Fase 7
Órdenes, cruce automático y notificaciones de apps de bancos: `docs/PHASE_07_ORDENES_Y_NOTIFICACIONES.md`. Pruebas SQL: `supabase/tests/run.sh`.
