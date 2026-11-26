# Plan de validación de fase 3

## Android
1. Ejecutar pruebas unitarias en entorno Android/Gradle.
2. Compilar debug y confirmar Room genera `PayVerifyDatabase_Impl`.
3. En teléfono de prueba, conceder permiso SMS y activar captura explícitamente.
4. Verificar remitente no permitido no crea evento.
5. Verificar OTP/código de seguridad nunca crea evento.
6. Verificar evento válido se persiste localmente sin conectividad.
7. Desactivar captura y confirmar que no se persisten nuevos eventos.
8. Inspeccionar logs: ningún cuerpo SMS, OTP ni dato bancario sensible.

## Backend
1. Desplegar la Edge Function solo en proyecto separado PayVerify.
2. Sin JWT: 401.
3. JWT inválido: 401.
4. Usuario sin membresía activa: 403.
5. Dispositivo revocado o de otro usuario: 403.
6. Payload inválido: 400.
7. Primer evento: 201; reenvío idempotente: 200.
8. Verificar service role solo en secretos de Edge Function.

## Web
1. Usuario no autenticado no ve pagos.
2. Usuario de organización A no consulta organización B.
3. Tabla no muestra texto SMS ni credenciales.
4. Exportación CSV neutraliza `=`, `+`, `-`, `@`, tab y CR al inicio de celdas.
5. Errores RLS se presentan sin filtrar detalles sensibles.

## Criterio de salida
No marcar como producción hasta completar pruebas físicas, revisión RLS, validación del parser con muestras anonimizadas aprobadas por cada banco y pruebas end-to-end.
