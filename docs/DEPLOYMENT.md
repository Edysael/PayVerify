# Despliegue PayVerify — staging primero

> **Estado actual:** PayVerify ya está desplegado en `LEGAL TECH-IT API SERVICES` con objetos `pv_*`/`payverify_*`, 13 Edge Functions y panel en Vercel. Esta guía describe un despliegue nuevo de staging; no vuelvas a aplicar estas migraciones en producción ni crees otro proyecto para la instalación actual. Consulta `ESTADO_ACTUAL_2026-11-26.md`.

## 0. Separación
Usa un proyecto Supabase exclusivo de PayVerify. No conectes ni migres el sistema contable ni APIs ajenas. No pongas la service role key en Next.js público ni en Android.

## 1. Supabase
1. Crea proyecto dedicado y guarda URL, anon/publishable key y service role en el entorno seguro.
2. Aplica en orden:
   - `supabase/migrations/0001_payverify_initial.sql`
   - `supabase/migrations/0002_payverify_integrity.sql`
   - `supabase/migrations/0003_statement_reconciliation.sql`
   - `supabase/migrations/0004_phase_completion.sql`
3. Prueba las migraciones en staging y verifica tablas, enums, RPC y políticas RLS.
4. Despliega todas las funciones:
   - `payment-event-ingest`
   - `statement-import`
   - `payment-reconcile`
   - `payment-unreconcile`
   - `organization-create`
   - `device-enroll`
   - `device-approve`
   - `device-revoke`
5. Configura secrets de Edge Functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase normalmente los provee al runtime; nunca los copies a cliente).
6. En Auth, configura proveedor Email OTP, SMTP adecuado y URLs de redirección para el dominio del panel.

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
- [ ] RLS multiempresa verificada con 2 organizaciones y 4 roles.
- [ ] Pruebas de ingestión idempotente, token expirado y dispositivo revocado.
- [ ] CSV probado con extractos anonimizados y duplicados.
- [ ] Conciliación y deshacer con auditoría.
- [ ] Build Android/web exitoso.
- [ ] Pruebas de teléfono real, privacidad, consentimiento y política de distribución SMS.
- [ ] Backup, monitoreo, límites y respuesta a incidentes documentados.

No se considera desplegado hasta que el propietario complete estos pasos y confirme resultados.
