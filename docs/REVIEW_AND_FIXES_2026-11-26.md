# PayVerify — hardening de revisión
Fecha: 26 de noviembre de 2026. Rama: codex/payverify-hardening-2026-11-26.

## Cambios
- Migración 0009: conciliación solo desde estados elegibles y misma cuenta bancaria activa; un pago no puede conciliarse con dos líneas.
- Importación CSV: lotes fallidos/incompletos reintentables; upsert idempotente; duplicados no abortan el lote; fingerprint por cuenta y ordinal para líneas idénticas.
- Órdenes: solo estados recibidos/revisables/reconciliados se pueden enlazar; cuenta conocida debe coincidir; pago reconciliado enlazado posteriormente mantiene paid_confirmed.
- order-status conserva exactamente su esquema y semántica heredada de paid; el checkout debe usar status=paid_confirmed para confirmación.
- order-update limita hints a 10 intentos totales por orden; HTTP 429 al exceder, sin poder reiniciar el límite esperando la ventana.
- Cuerpos JSON null/array en endpoints de órdenes devuelven 400.
- UI: registro de cuentas, vinculación de remitentes, selector de cuenta en importación y candidatos filtrados por cuenta/estado.
- Web: Next.js 16.4.6, Vitest 5.1.2 y PostCSS 8.5.23 fijados en lockfile; CI agrega typecheck, audit y Deno check.
- Cabeceras HTTP de seguridad en Next.js.
- Android: fingerprint alineado con backend, preferencias SMS unificadas, referencias admiten -, _ y /.

## Pendiente
- No se limitó creación de organizaciones ni dispositivos; requiere política de producto.
- CSP requiere nonce/estrategia compatible con scripts de Next.js.
- La migración 0009 y funciones modificadas no están desplegadas; aplicar primero en staging.


## Ajustes adicionales
- Ingesta: valida que la cuenta vinculada al remitente esté activa y sea VES; la detección de duplicados se limita a la misma cuenta.
- Al reenviar un evento idempotente antiguo sin cuenta, puede completar la asociación si el remitente ya está vinculado y no contradice una orden enlazada.
- En la versión real del repositorio, `device-revoke` ya permite revocar dispositivos pendientes; no requería ese cambio.
- Quedan sin política aplicada el límite de organizaciones y la idempotencia/límite de nuevos dispositivos.
