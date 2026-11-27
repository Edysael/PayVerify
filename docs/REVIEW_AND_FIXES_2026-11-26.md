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


## Auditoría adicional de 20 controles (27 de noviembre de 2026)

1. **API key y tenant:** ahora exige `organizationId` UUID y coincidencia exacta con la organización de la llave; evita contexto ambiguo entre tenants.
2. **JWT:** exige sesión válida y membresía activa en la organización solicitada.
3. **Roles de sesión:** endpoints de operación restringen roles según acción; consulta de estado permite viewer.
4. **Enrolamiento de dispositivo:** ahora solo owner/admin/operator activos pueden solicitar enrolamiento; viewer ya no puede crear dispositivos.
5. **Aprobación de dispositivo:** owner/admin y transición atómica desde pending.
6. **Revocación:** owner/admin y transición atómica desde active.
7. **Ingesta de dispositivo:** comprueba propietario, organización y estado activo; dispositivo pending/revoked no ingresa eventos.
8. **Remitente SMS:** exige remitente autorizado y habilitado por organización.
9. **Importes de ingesta:** minor units enteros positivos, safe integer y rango acotado.
10. **Moneda de ingesta:** VES solamente; cuentas de remitente activas y VES.
11. **Fecha de evento:** rechaza >10 minutos futuro y >90 días antiguo.
12. **Idempotencia de evento:** clave SHA-256 reconstruida en servidor y unicidad para duplicados.
13. **Privacidad SMS:** no persiste el cuerpo bruto, OTP, PIN ni credenciales.
14. **Duplicado SMS/notificación:** marca posible duplicado en la misma cuenta; no lo auto-concilia.
15. **Creación de orden:** referencia externa acotada, monto positivo, expiración 1–1440 min y cuenta VES activa.
16. **Orden idempotente:** además del monto, ahora rechaza reintentos con cuenta/hints conflictivos.
17. **Acción manual:** SQL valida estado, monto, cuenta y moneda; Edge Function ahora mapea `currency_mismatch` como HTTP 409.
18. **Hints del pagador:** validación de formato y límite de intentos total por orden; RPC protegida de ejecución directa.
19. **Importación CSV:** rol autorizado, cuenta activa de la organización, moneda coincidente, precisión decimal y máximo 5.000 filas.
20. **Conciliación:** SQL atómico verifica organización, misma cuenta activa, monto, moneda, referencia, fecha, estado elegible y unicidad de pago conciliado.

### Correcciones de esta pasada
- API keys vinculadas a un `organizationId` explícito y coincidente.
- Error de moneda manual traducido a conflicto 409.
- Duplicados de orden con cuenta o hints incompatibles ahora responden 409.
- `order-status`: `paid` es true solo para `paid_confirmed`; `paymentDetected` distingue `paid_probable`.
- Enrolamiento de dispositivos restringido a roles operativos.

### Riesgos/limitaciones que permanecen
- El CSV es parseado en el cliente y el servidor recibe filas estructuradas + hash declarado; el servidor no recibe el archivo original para recalcular su hash. Un operador autorizado podría fabricar filas. Por eso `paid_confirmed` solo significa conciliación operativa contra el extracto aportado, no verificación independiente bancaria.
- CSP aún requiere estrategia compatible con Next.js.
- La migración y funciones siguen sin despliegue; staging primero.
- No se añadió rate limit de creación de organizaciones/dispositivos.
