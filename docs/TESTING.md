# Plan de pruebas PayVerify

## Web
```bash
cd web
npm ci
npm test
npm run build
```
Pruebas incluidas: exportación CSV, filtros, candidatos de conciliación y parser de extractos.

## Android
Desde Android Studio:
- Ejecutar unit tests de `PaymentLocalRules`, parser SMS, fingerprint, política de sync.
- Compilar debug.
- Probar SMS sintético en teléfono físico.
- Probar permiso denegado/revocado, captura pausada, remitente desconocido y mensaje OTP.
- Verificar que el cuerpo SMS no se almacena ni aparece en logs.

## Supabase staging
- Dos organizaciones; usuarios owner/admin/operator/viewer.
- Intentos de lectura cruzada deben devolver cero filas.
- Viewer no puede mutar remitentes, dispositivos, pagos ni conciliaciones.
- Device pending no ingiere; active sí; revoked no.
- Reintento del mismo evento retorna duplicate y no crea otra fila.
- Importar mismo archivo dos veces no duplica batch.
- CSV inválido o con filas fuera de límites se rechaza.
- Candidato no cambia estado hasta confirmación.
- Conciliar/deshacer actualiza line, payment, reconciliation record y audit log en transacción.

## Limitación actual
Las pruebas no se ejecutaron en este entorno porque no se instalaron dependencias npm, Android SDK/JDK ni un proyecto Supabase de staging. No se declara build/test passing sin ejecutar estos comandos.


## Hardening 0009
El runner SQL ejecuta \`0009_hardening_test.sql\` y reaplica la migración 0009 para comprobar idempotencia. Incluye pruebas de cuenta bancaria, estados no conciliables, hints limitados y preservación de \`paid_confirmed\`.
CI añade \`npm run typecheck\`, \`npm audit --omit=dev --audit-level=high\` y \`deno check supabase/functions/*/index.ts supabase/functions/_shared/auth.ts\`.

