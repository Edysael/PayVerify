# PayVerify — verificación de producción
Fecha: 26 de noviembre de 2026

## Código y CI
- Commit de aplicación desplegado: `826fba46c10a5a84176861d5f36ed051619de468`.
- Commit de documentación actual: `8ff1a7c0cf19ed4f8cc78f84b4ecd65ad3b6d000`.
- CI de aplicación: https://github.com/Edysael/PayVerify/actions/runs/45896790057 — web, Android y SQL: success.
- CI de documentación/estado: https://github.com/Edysael/PayVerify/actions/runs/45897110039 — web, Android y SQL: success.
- APK debug artifact: `15154955206`, 9,726,133 bytes.

## Supabase
- Proyecto: `fzumtynskvcrybzejmbo` (LEGAL TECH-IT API SERVICES).
- PayVerify migrations 0001–0008 registradas.
- 13 Edge Functions ACTIVE.
- `device-approve` v2 y `device-revoke` v2 desplegadas; código de cada una comparado con GitHub y coincide; JWT requerido.
- Cron `payverify-expire-orders` activo cada 5 minutos.
- Migration 0008: 19/19 índices presentes; 0 políticas operator ALL antiguas; 3 políticas de escritura por tabla para bancos y remitentes.

### Prueba de flujo real en la base de producción (transacción reversible)
Se ejecutó una transacción con datos temporales dentro de una organización existente:
1. Crear dispositivo QA temporal.
2. Crear orden de prueba.
3. Insertar evento de pago.
4. Ejecutar `payverify_match_payment` y confirmar match por referencia.
5. Insertar batch y línea de extracto.
6. Ejecutar `payverify_reconcile_statement_line`; la orden pasó a `paid_confirmed`.
7. Ejecutar `payverify_unreconcile_statement_line`; la orden volvió a `paid_probable`.
8. `ROLLBACK`.

La consulta posterior confirmó 0 órdenes QA, 0 pagos QA, 0 batches QA y 0 líneas QA restantes. No se dejaron registros de prueba en producción.

## Vercel
- Deployment `dpl_3ppv8Nd4SpXcsREPtv99yeYajq1b` — READY.
- Fuente GitHub `Edysael/PayVerify`, rama `main`, commit `826fba4`.
- Alias `payverify-nine.vercel.app` verificado apuntando a ese deployment.
- La página raíz responde y muestra la pantalla de inicio de sesión.
- No se encontraron errores runtime en el último periodo consultado.
- El proyecto no tiene Git integration automática; el deployment se realizó desde la fuente GitHub usando el proyecto Vercel existente.

## Alcance de esta verificación
Esto confirma build, despliegue, funciones actualizadas, migración y el flujo SQL de conciliación en producción con rollback. No sustituye:
- la prueba de captura SMS/notificación en un teléfono Android físico;
- una llamada real a checkout con API key;
- la importación de una cartola bancaria real/anónima;
- la aceptación comercial y firma de APK release.
