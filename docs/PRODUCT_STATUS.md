# Estado de PayVerify

## Implementado y CI verificado
- Android Kotlin/Compose, Room, WorkManager, OTP, Supabase, enrolamiento/aprobación.
- Captura SMS opt-in y notificaciones bancarias autorizadas; parser, deduplicación y sincronización.
- Panel Next.js: organizaciones, pagos, dispositivos, remitentes, órdenes, API keys, CSV, conciliación.
- Backend Supabase Auth/PostgreSQL/RLS, auditoría, Edge Functions, matching y conciliación.
- CI web/Android/SQL success: https://github.com/Edysael/PayVerify/actions/runs/45897110039
- APK debug artifact `15154955206`.
- Migration 0008 aplicada: 19 índices FK y políticas RLS de escritura separadas.
- `device-approve` y `device-revoke` producción v2 coinciden con repo.

## Infraestructura
- Supabase migrations 0001–0008; 13 Edge Functions activas; cron cada 5 minutos.
- Vercel deployment `READY` desde commit de aplicación `826fba4`; alias https://payverify-nine.vercel.app apunta al deployment.
- Página raíz responde con login; no se detectaron errores runtime en el último periodo consultado.
- Git integration automática no configurada; deploy actual fue manual desde GitHub.

## Verificación de producción
Prueba transaccional real: order -> payment match -> reconcile -> `paid_confirmed` -> unreconcile -> `paid_probable`; rollback confirmado sin datos QA. Ver `docs/PRODUCTION_VERIFICATION_2026-11-26.md`.

## Estado de aceptación
No certificado para lanzamiento comercial: falta aceptación Android física, checkout real y cartola bancaria real/anónima. Producción aún tiene 0 órdenes, 0 eventos de pago y 0 líneas de extracto.

## Reglas
- No almacenar/transmitir cuerpo SMS ni procesar historial.
- No recolectar OTP, PIN, contraseñas ni credenciales bancarias.
- SMS/notificación no confirma fondos.
- `paid_confirmed` requiere conciliación con extracto y acción autorizada.
- No modificar APIs ni sistema contable externos.
- PayVerify usa `pv_*` y `payverify_*` dentro del Supabase compartido.
