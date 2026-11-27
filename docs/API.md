# PayVerify — contratos implementados

Las rutas son Supabase Edge Functions; no son APIs bancarias directas.

| Function | Método | Uso |
|---|---|---|
| `organization-create` | POST | Crear organización y propietario |
| `device-enroll` | POST | Solicitar dispositivo `pending` |
| `device-approve` | POST | Owner/admin aprueba dispositivo |
| `device-revoke` | POST | Owner/admin revoca dispositivo |
| `payment-event-ingest` | POST | Ingesta autenticada e idempotente de datos estructurados |
| `statement-import` | POST | Importar líneas CSV ya validadas y sanitizadas |
| `payment-reconcile` | POST | Confirmar conciliación con RPC SQL atómica |
| `payment-unreconcile` | POST | Deshacer conciliación con auditoría |
| `pabilo-verify` | POST | Verificación bancaria de una orden vía Pabilo |

Todas requieren sesión Bearer de Supabase Auth o una API key PayVerify válida cuando la función lo documenta. La service role se usa solo dentro de Edge Functions.

## Ingesta de pago

Payload: `organizationId`, `deviceId`, `eventId`, `amountMinorUnits`, `currency`, `reference`, `senderIdentifier`, `transactionTimeMillis`, `idempotencyKey`.

No enviar: `sms_body`, `message_body`, OTP, PIN, contraseña, token bancario o número de cuenta completo.

El backend verifica usuario, membresía, dispositivo activo, remitente habilitado, moneda, monto y clave de idempotencia.

## Conciliación

La función de candidato solo propone coincidencias. La RPC comprueba organización, rol, monto, moneda, referencia, cuenta bancaria activa y tolerancia temporal; actualiza el evento, línea, registro de conciliación y auditoría en una transacción. `paid_confirmed` significa que un operador autorizado concilió el movimiento contra el extracto aportado; no es una verificación directa del banco ni una confirmación de API bancaria.

## Órdenes y confirmación

- `order-create`: crea una orden idempotente por organización y referencia externa.
- `order-update`: recibe hints de teléfono/referencia; máximo 10 intentos por orden en total. Al exceder, responde HTTP 429 con Retry-After.
- `order-status`: conserva el esquema de respuesta. `paid` solo es `true` para `paid_confirmed`; `paymentDetected` indica `paid_probable` o `paid_confirmed`.
- `order-action`: acción humana autorizada para aprobar, rechazar, vincular o cancelar.

## Pabilo — verificación bancaria

La Edge Function `pabilo-verify` consulta `POST /userbankpayment/{userBankId}/betaserio` desde el servidor. No llama a Pabilo desde el navegador ni desde Android.

### Variables de entorno (Edge Function secrets)

- `PABILO_API_KEY`: API key privada de Pabilo.
- `PABILO_USER_BANK_ID`: ID de cuenta bancaria configurada en Pabilo.
- `PABILO_ORGANIZATION_ID`: UUID de la única organización PayVerify autorizada para esta configuración inicial.
- `PABILO_PAYVERIFY_BANK_ACCOUNT_ID`: UUID de la cuenta bancaria PayVerify que está mapeada a la cuenta Pabilo anterior.

La integración inicial es **single-tenant y fail-closed**: no se habilita si falta una variable y rechaza otras organizaciones o cuentas. No reutilizar esta configuración global para comercios múltiples; antes de SaaS multi-tenant, crear un registro de configuración por organización con secretos protegidos y controles de acceso.

### Solicitud

POST `/functions/v1/pabilo-verify`

Autenticación: JWT de operador PayVerify o header `x-payverify-key` con API key de la misma organización.

```json
{
  "organizationId": "UUID_ORGANIZACION",
  "orderId": "UUID_ORDEN",
  "bankReference": "REFERENCIA_BANCARIA",
  "movementType": "GENERIC",
  "paymentDate": "YYYY-MM-DD"
}
```

`movementType` admite `GENERIC`, `MOVIL_PAY` o `TRANSFER`. Para bancos que requieren Pago Móvil se pueden enviar `payerDni: { "dni_type": "V", "dni_number": "12345678" }`, `payerPhone` y `originBankCode` según los requisitos del banco. No enviar OTP, PIN ni credenciales bancarias.

El backend toma el monto de la orden, no del cliente, y comprueba que la orden pertenezca a la organización, esté vigente y use la cuenta PayVerify mapeada. Verifica que la respuesta del proveedor contenga estado válido, referencia exacta y monto coincidente.

### Respuesta y estado

Una respuesta positiva devuelve `verificationStatus: "provider_verified"`, identificador de la operación del proveedor y `requiresReconciliation: true`.

**Esta primera versión no cambia la orden a `paid_confirmed` ni responde `paid: true`.** La evidencia todavía debe persistirse y vincularse atómicamente a la orden y cuenta bancaria antes de habilitar la transición de estado. Las respuestas de error del proveedor se normalizan; no se devuelve su payload completo ni se exponen secretos.

## Importación de extracto

`statement-import` acepta `bankAccountId` opcional por compatibilidad. Si se omite, debe existir exactamente una cuenta bancaria activa. Se valida cuenta y moneda. Lotes fallidos o `pending_review` pueden reintentarse; fingerprints duplicados se omiten sin abortar todo el archivo. La respuesta incluye `skippedDuplicates`.
