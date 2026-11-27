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

Todas requieren sesión Bearer de Supabase Auth. La service role se usa solo dentro de Edge Functions.

## Ingesta de pago
Payload: `organizationId`, `deviceId`, `eventId`, `amountMinorUnits`, `currency`, `reference`, `senderIdentifier`, `transactionTimeMillis`, `idempotencyKey`.

No enviar: `sms_body`, `message_body`, OTP, PIN, contraseña, token bancario o número de cuenta completo.

El backend verifica usuario, membresía, dispositivo activo, remitente habilitado, moneda, monto y clave de idempotencia.

## Conciliación
La función de candidato solo propone coincidencias. La RPC comprueba organización, rol, monto, moneda, referencia y tolerancia temporal; actualiza el evento, línea, registro de conciliación y auditoría en una transacción.


## Órdenes y confirmación
- \`order-create\`: crea una orden idempotente por organización y referencia externa.
- \`order-update\`: recibe hints de teléfono/referencia; máximo 10 intentos por orden en total. Al exceder, responde HTTP 429 con Retry-After.
- \`order-status\`: conserva el esquema de respuesta. \`paid\` solo es \`true\` para \`paid_confirmed\`; \`paymentDetected\` indica \`paid_probable\` o \`paid_confirmed\`.
- \`order-action\`: acción humana autorizada para aprobar, rechazar, vincular o cancelar.

## Importación de extracto
\`statement-import\` acepta \`bankAccountId\` opcional por compatibilidad. Si se omite, debe existir exactamente una cuenta bancaria activa. Se valida cuenta y moneda. Lotes fallidos o \`pending_review\` pueden reintentarse; fingerprints duplicados se omiten sin abortar todo el archivo. La respuesta incluye \`skippedDuplicates\`.
