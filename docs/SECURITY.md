# Seguridad y privacidad

## Captura
- Opt-in explícito y permiso RECEIVE_SMS.
- Lista exacta de remitentes configurada por usuario/organización.
- Parseo local; no guardar ni transmitir el texto SMS completo.
- Rechazar mensajes de OTP, PIN, token o autenticación.
- No solicitar READ_SMS ni recolectar historial.
- Los SMS pueden ser falsificados; nunca equivalen a saldo o fondos disponibles.
- El timestamp de SMS se almacena como hora de notificación; no debe confundirse con fecha/hora de operación bancaria.

## Backend
- Supabase Auth en cada Edge Function.
- RLS por organización; permisos de escritura limitados por rol.
- Service role solo en runtime de Edge Functions.
- Dispositivo debe estar enrolado, activo y asociado al usuario/organización.
- Idempotencia y validación de campos, límites de payload y auditoría.
- Revocación bloquea la sincronización.

## Extractos
- CSV limitado a 2 MB y 5.000 filas.
- Vista previa y validación antes de importar.
- Descripción truncada y redactada; evitar datos de cuenta.
- Conciliación exige match exacto de importe, moneda, referencia y ventana temporal, además de confirmación explícita.
- Conciliar/deshacer se ejecuta en RPC SQL transaccional con auditoría.

## Antes de producción
Threat model, pruebas RLS multiempresa, pentest, revisión de logs, políticas de retención/eliminación, revisión legal y políticas de distribución de permisos SMS. Nunca marcar `BANK_CONFIRMED` basándose en SMS.


- La conciliación requiere estado elegible (\`RECEIVED_BY_SERVER\` o \`PENDING_REVIEW\`), misma cuenta bancaria activa y coincidente, monto, moneda, referencia y ventana temporal.
- \`paid_probable\` es solo pago detectado; \`paid\`/confirmación exige \`paid_confirmed\` tras conciliación con extracto.
- Los hints de referencia/teléfono se limitan a 10 intentos totales por orden (el contador por ventana no reinicia el límite total).
- La configuración de Edge Functions mantiene JWT verificado para funciones de usuario; checkout con API key realiza autenticación manual en \`resolveCaller\`.
