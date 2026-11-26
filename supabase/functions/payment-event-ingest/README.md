# payment-event-ingest

Payload esperado: `organizationId`, `deviceId`, `eventId`, `amountMinorUnits`, `currency`, `reference`, `senderIdentifier`, `transactionTimeMillis`, `idempotencyKey`.

La función verifica sesión, membresía, dispositivo activo y remitente SMS habilitado para esa organización. Inserta datos estructurados y devuelve la fila existente en reintentos idempotentes.

Nunca aceptar ni persistir cuerpo SMS, OTP, PIN, contraseña, token bancario o credenciales. El estado `RECEIVED_BY_SERVER` no significa que el banco haya confirmado fondos.
