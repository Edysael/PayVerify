# Auditoría PayVerify — 2026-11-26

Alcance real: migraciones 0001–0008, las 13 Edge Functions, CI, parser/exportador CSV, `middleware.ts`, `next.config.ts` y parte de la documentación.
**No revisado:** código Android, páginas y componentes del panel web, contenido de las pruebas SQL existentes, estado real de RLS/funciones en Supabase y despliegue en Vercel.
Todo lo siguiente sale de leer el código; solo se ejecutó la prueba de `statement-import` con un cliente simulado (ver `supabase/tests/functions`).

## Corregido en este paquete
| # | Problema | Cambio |
|---|----------|--------|
| 1 | Un lote de importación `failed` (o `pending_review` abandonado) bloqueaba para siempre el reintento del mismo archivo | `statement-import` lo limpia y reintenta |
| 2 | Una sola línea con huella repetida (líneas idénticas en el archivo, o extractos solapados) hacía fallar toda la importación | Las repeticiones dentro del archivo llevan sufijo `#n`; las ya importadas se omiten (`skipped` en la respuesta) |
| 2b | Limpiar un lote viejo con `ON DELETE CASCADE` podía borrar líneas ya conciliadas | `statement-import` no borra ningún lote que tenga líneas `matched`; responde `duplicate:true` |
| 3 | La conciliación aceptaba pagos `REJECTED` / `PARSING_ERROR` | Migración 0009: `payment_not_reconcilable` |
| 4 | La conciliación no cruzaba cuenta bancaria (el import nunca la guardaba) | `statement-import` acepta `bankAccountId` opcional; 0009 compara cuentas si ambas existen: `bank_account_mismatch` |
| 5 | Orden vinculada a un pago ya conciliado quedaba en `paid_probable` | Trigger BEFORE UPDATE en `payverify_orders` (0009) |
| 6 | Imports sin versión fija en `statement-import` y `payment-reconcile` | `supabase-js@2.49.1` |
| 7 | CI sin `permissions`, sin type-check de funciones ni auditoría de dependencias | Añadidos (los dos últimos son informativos) |
| 8 | Sin cabeceras de seguridad en el panel | `next.config.ts` (sin CSP) |
| 9 | `order-create/status/update` lanzaban excepción (500) con cuerpo JSON `null` | `supabase/apply_null_body_guard.py` (idempotente) → 400 `invalid_json`. Un array `[]` ahora da `invalid_json` en vez de `invalid_external_ref` (sigue siendo 400) |
| 10 | `supabase-js@2` sin fijar en las 13 funciones | `supabase/pin_supabase_js.py` (idempotente) → `@2.49.1` |
| 11 | `DEPLOYMENT.md` listaba solo 0001–0004 y 8 funciones | Actualizado a 0001–0009 y 13 funciones, con notas sobre cron y JWT |

Compatibilidad: no se cambió ningún endpoint, parámetro obligatorio ni forma de respuesta existente. Se añadieron `bankAccountId` (entrada opcional), `skipped` (salida) y dos códigos de error 409.

## Pendiente — requiere tu decisión (cambia comportamiento)
- `organization-create`: cualquier usuario autenticado puede crear organizaciones sin límite (y el proyecto Supabase es compartido con otras apps). Sugerido: tope por usuario.
- `order-update` / `payverify_order_set_hints`: sin límite de intentos; una terminación de referencia de 4 caracteres puede adivinarse. Sugerido: contador de intentos por orden.
- `order-status` devuelve `paid:true` para `paid_probable` (detectado por SMS). Tu checkout debe usar `confirmedByStatement`. No se tocó por ser API existente.
- `device-revoke` solo acepta dispositivos activos; uno pendiente no se puede rechazar. `device-enroll` sin tope ni idempotencia.
- Falsos `POSSIBLE_DUPLICATE` (mismo monto y referencia corta en 48 h) sin vía para limpiarlos.

## Pendiente — menor
- Duplicación de código en varias funciones frente a `_shared/auth.ts`.
- Cron de `payverify_expire_orders` y `verify_jwt` de las funciones no están en el repo (`supabase/config.toml` ausente). Antes de crear un cron, revisar `select * from cron.job`.
- Verificar que `web/package-lock.json` resuelva `next >= 15.2.3` (`npm ls next`).
- Parser CSV: solo ISO y `dd/mm/yyyy`, interpreta fechas en UTC, sin columnas separadas de débito/crédito.
- La migración 0008 no es idempotente (no se editó: ya está aplicada).

## Verificación
Ejecutado en local (con clientes simulados, no contra Supabase real): 9 pruebas de `statement-import` y 3 de cuerpo no-objeto en `order-*`, verificando además que estas últimas fallan sin la guarda. Nada del SQL, ni los builds web/Android, se ejecutó.

Ver los checks del CI sobre estos cambios. Hasta que `sql`, `web`, `android-apk` y `edge-functions` pasen en verde con este paquete aplicado, no debe afirmarse que funciona. Las migraciones deben probarse en un entorno de staging antes de producción.

## Aplicado en producción (proyecto LEGAL TECH-IT API SERVICES) — 2026-11-27
Hecho con el conector de Supabase, sin pasar por GitHub (el conector de GitHub quedó en solo lectura):
- **Migración `payverify_0009_reconciliation_hardening`**: aplicada. Antes se probó contra el esquema real dentro de un bloque que siempre se revierte (4 casos: pago `REJECTED`, cuentas distintas, cuenta igual, orden con pago ya conciliado, y regresión de orden con pago no conciliado). Todos pasaron y no quedó nada guardado.
- **Edge Functions `statement-import` y `payment-reconcile`**: redesplegadas (v2, `verify_jwt` = true, `supabase-js@2.49.1`).
- **No se tocó**: `erp-contable-chile` ni ningún objeto de otras apps del proyecto. Las funciones `order-*` no se redesplegaron (la guarda de cuerpo `null` sigue pendiente de aplicar desde el repo).
- **Estado verificado antes de cambiar**: PayVerify tenía 0 pagos, 0 órdenes y 0 líneas de extracto; las 13 funciones activas (`order-create/status/update` con `verify_jwt` = false, el resto true); cron `payverify-expire-orders` activo cada 5 minutos; el asesor de seguridad no reporta tablas `pv_*` sin RLS.

**No verificado:** no pude llamar a las funciones desplegadas (el entorno bloquea el acceso de red a Supabase), así que su comportamiento real con un usuario autenticado no está probado. La prueba de `statement-import` sigue siendo con un cliente simulado. Los builds web y Android y el CI tampoco se ejecutaron.

**Para deshacer la migración 0009** (si hiciera falta): `drop trigger payverify_order_confirm_on_match on public.payverify_orders;` y volver a aplicar la definición de `payverify_reconcile_statement_line` de la migración 0004.

## Hallazgos del asesor de seguridad (solo lectura)
- `public.pv_can_operate_org` y `public.pv_is_org_member` son ejecutables por usuarios autenticados vía RPC. Son los helpers de las políticas RLS y solo consultan la membresía del propio usuario, así que el riesgo es bajo.
- Aviso de contraseñas filtradas desactivado en Auth: PayVerify usa OTP, pero el proyecto es compartido con otras apps.
- Tablas del esquema `one` y `public.app_settings` con RLS sin políticas, `one.records_set_code` sin `search_path` fijo y `pg_net` en `public`: pertenecen a otras apps, no se tocaron.
