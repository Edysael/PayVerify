# Supabase Edge Functions

Funciones implementadas:
- `payment-event-ingest`
- `statement-import`
- `payment-reconcile`
- `payment-unreconcile`
- `organization-create`
- `device-enroll`
- `device-approve`
- `device-revoke`

Todas autentican sesión con `auth.getUser()`. Las funciones de escritura privilegiada usan `SUPABASE_SERVICE_ROLE_KEY` solo en runtime server-side y validan membresía/rol antes de operar. No expongas service role en Android ni navegador.

Despliega en el proyecto PayVerify dedicado, después de aplicar migraciones. Ejecuta pruebas en staging antes de habilitar la app.

## Órdenes y cruce (migración 0005)
- `order-create`: crea una orden (sesión de operador o `x-payverify-key`). Idempotente por `externalRef`.
- `order-update`: el cliente informa referencia/teléfono; reevalúa el cruce.
- `order-status`: estado de una orden para el checkout (no expone datos del pagador).
- `order-action`: `approve` | `reject_match` | `link` | `cancel` (solo sesión de operador).
- `api-key-create`: crea o revoca llaves de API (solo owner/admin). La llave se muestra una sola vez.
- `_shared/auth.ts`: autenticación común. Se despliega junto con las funciones.
