# Pendientes reales de PayVerify

Actualizado: 26 de noviembre de 2026. No recrear repo ni Supabase; no volver a subir el código desde cero.

## Hecho y verificado
- CI web, Android y SQL success: https://github.com/Edysael/PayVerify/actions/runs/45897110039
- APK debug artifact `15154955206`.
- Supabase migrations 0001–0008 aplicadas; 13 Edge Functions activas.
- `device-approve` y `device-revoke` v2 coinciden con GitHub.
- Cron de vencimiento cada 5 minutos.
- Migration 0008: 19 índices y políticas RLS de escritura verificadas.
- Prueba reversible de producción: match, conciliación y deshacer pasaron; rollback confirmado sin datos QA.
- Vercel deployment READY; alias https://payverify-nine.vercel.app apunta a la versión nueva.

## Pendiente para aceptación comercial
1. Android físico: OTP, conexión, enrolamiento/aprobación, permisos SMS/notificaciones, remitentes autorizados y sync.
2. Checkout real: `order-create`, `order-status`, `order-update` con API key protegida; idempotencia, expiración y estados.
3. Cartola CSV: importación, candidatos, conciliar/deshacer y confirmar `paid_confirmed`.
4. Plantillas bancarias con muestras anonimizadas.
5. Aislamiento multiempresa/roles en prueba de usuario real.
6. APK release firmado y revisión de privacidad/consentimiento/políticas SMS.

## Datos actuales
- 2 organizaciones, 2 API keys activas.
- 0 órdenes, 0 eventos de pago y 0 líneas de extracto.
- La prueba SQL QA se ejecutó con rollback y no dejó datos.

No modificar TomaYa, Mensajero Pro, APIs externas ni sistema contable.
