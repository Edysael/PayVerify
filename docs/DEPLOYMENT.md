# Despliegue PayVerify — staging primero

> **Estado actual:** PayVerify ya está desplegado en `LEGAL TECH-IT API SERVICES` con objetos `pv_*`/`payverify_*`, 13 Edge Functions y panel en Vercel. Esta guía describe un despliegue nuevo de staging; no vuelvas a aplicar estas migraciones en producción ni crees otro proyecto para la instalación actual. Consulta `ESTADO_ACTUAL_2026-11-26.md`.
> La migración `0009` y las versiones nuevas de `statement-import` y `payment-reconcile` ya están aplicadas en producción (2026-11-27); ver `AUDITORIA_2026-11-26.md`. Las migraciones 0010 y 0011 y las funciones `order-*`, `organization-create`, `device-enroll`, `device-revoke` y `payment-duplicate-resolve` también están en producción (2026-11-27, PRs #3–#8). El panel web está desplegado en Vercel desde `main` (`d5c0da4`, 2026-11-27). El proyecto Vercel tiene el directorio raíz en `web`: despliega desde la raíz del repo, no desde `web/`.

## 0. Separación
Usa un proyecto Supabase exclusivo de PayVerify. No conectes ni migres el sistema contable ni APIs ajenas. No pongas la service role key en Next.js público ni en Android.

## 1. Supabase
1. Crea proyecto dedicado y guarda URL, anon/publishable key y service role en el entorno seguro.
2. Aplica en orden:
   - `supabase/migrations/0001_payverify_initial.sql`
   - `supabase/migrations/0002_payverify_integrity.sql`
   - `supabase/migrations/0003_statement_reconciliation.sql`
   - `supabase/migrations/0004_phase_completion.sql`
   - `supabase/migrations/0005_orders_and_matching.sql`
   - `supabase/migrations/0006_harden_grants.sql`
   - `supabase/migrations/0007_revoke_public_trigger_execute.sql`
   - `supabase/migrations/0008_performance_and_policy_hardening.sql`
   - `supabase/migrations/0009_reconciliation_hardening.sql`
   - `supabase/migrations/0010_order_hint_attempts.sql`
   - `supabase/migrations/0011_resolve_possible_duplicate.sql`
   - `supabase/migrations/0012_expire_orders_cron.sql`
3. Prueba las migraciones en staging y verifica tablas, enums, RPC y políticas RLS. El CI (`supabase/tests/run.sh`) las aplica en un Postgres limpio y corre las pruebas SQL.
4. Despliega todas las funciones (14):
   - `payment-event-ingest`
   - `statement-import`
   - `payment-reconcile`
   - `payment-unreconcile`
   - `organization-create`
   - `device-enroll`
   - `device-approve`
   - `device-revoke`
   - `api-key-create`
   - `order-create`
   - `order-status`
   - `order-update`
   - `order-action`
   - `payment-duplicate-resolve`
5. Configura secrets de Edge Functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase normalmente los provee al runtime; nunca los copies a cliente).
6. `order-create`, `order-status` y `order-update` se autentican con el header `x-payverify-key` (API key del comercio) y no con un JWT de sesión. En el proyecto actual (verificado el 2026-11-27) esas tres tienen `verify_jwt = false` y el resto `true`; `supabase/config.toml` lo define para `supabase functions deploy`.
7. El vencimiento de órdenes (`payverify_expire_orders`) debe ejecutarse periódicamente (el README indica cada 5 minutos). La migración `0012` crea el job `payverify-expire-orders` (`*/5 * * * *`) si pg_cron está instalado y el job no existe; si pg_cron falta, solo avisa (habilítalo desde el panel de Supabase y vuelve a aplicarla).
8. En Auth, configura proveedor Email OTP, SMTP adecuado y URLs de redirección para el dominio del panel.

## 2. Panel web (Vercel u otro hosting)
Variables de entorno:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`NEXT_PUBLIC_*` son públicas por diseño; la seguridad depende de RLS. Nunca agregar `SUPABASE_SERVICE_ROLE_KEY` a variables públicas.

Build local:
```bash
cd web
npm ci
npm test
npm run build
```
Después de build exitoso, despliega a Vercel y configura dominio/HTTPS.

## 3. Android
1. Abrir `android/` en Android Studio con JDK/SDK compatible.
2. Compilar y ejecutar tests.
3. Configurar URL Supabase, anon key y UUID de organización en la app.
4. Iniciar sesión por OTP, solicitar enrolamiento y aprobar el dispositivo desde el panel.
5. Agregar y habilitar el remitente exacto en el panel y en Android.
6. Activar captura y verificar sync en dispositivo de prueba.
7. Preparar APK firmado solo después de las pruebas de aceptación.

## 4. Gate de producción
- [ ] CI en verde sobre el commit a desplegar (`sql`, `web`, `android-apk`, `edge-functions`).
- [ ] RLS multiempresa verificada con 2 organizaciones y 4 roles.
- [ ] Pruebas de ingestión idempotente, token expirado y dispositivo revocado.
- [ ] CSV probado con extractos anonimizados y duplicados.
- [ ] Conciliación y deshacer con auditoría.
- [ ] Build Android/web exitoso.
- [ ] Pruebas de teléfono real, privacidad, consentimiento y política de distribución SMS.
- [ ] Backup, monitoreo, límites y respuesta a incidentes documentados.

No se considera desplegado hasta que el propietario complete estos pasos y confirme resultados.
