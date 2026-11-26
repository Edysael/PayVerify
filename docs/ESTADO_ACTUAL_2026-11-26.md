# Estado actual de PayVerify — 26 de noviembre de 2026

## Código y CI

- Repositorio privado: https://github.com/Edysael/PayVerify
- Código de aplicación desplegado desde commit `826fba46c10a5a84176861d5f36ed051619de468`.
- CI de aplicación: https://github.com/Edysael/PayVerify/actions/runs/45896790057 — web, Android y SQL: success.
- CI de estado/documentación: https://github.com/Edysael/PayVerify/actions/runs/45897110039 — web, Android y SQL: success.
- APK debug: artifact `15154955206`, 9.7 MB. No es release firmada.

## Supabase de producción

Proyecto `LEGAL TECH-IT API SERVICES`, ref `fzumtynskvcrybzejmbo`.

- Migraciones PayVerify 0001–0008 registradas.
- 13 Edge Functions ACTIVE.
- `device-approve` y `device-revoke` versión 2; código desplegado coincide con GitHub y ambas requieren JWT.
- Cron de vencimiento activo cada 5 minutos.
- 2 organizaciones, 2 API keys activas, 0 órdenes, 0 eventos de pago y 0 líneas de extracto.

### Hardening 0008
- 19 índices de soporte para claves foráneas.
- Políticas operator ALL redundantes reemplazadas por INSERT/UPDATE/DELETE.
- Verificación: 19/19 índices, 0 políticas ALL antiguas, 3 políticas de escritura por tabla.
- Advisor ya no reporta FKs PayVerify sin índice ni las políticas SELECT redundantes.
- Permanecen dos avisos SECURITY DEFINER para funciones de membresía usadas por RLS; no revocar sin rediseñar.
- Los índices no usados son esperables con tablas vacías.

### Prueba SQL en producción
Se ejecutó una transacción reversible de orden, pago, match por referencia, conciliación a `paid_confirmed` y deshacer a `paid_probable`. Pasó y se hizo ROLLBACK. La consulta posterior confirmó que no quedaron datos QA. Detalle: `docs/PRODUCTION_VERIFICATION_2026-11-26.md`.

## Panel Vercel
- Deployment `dpl_3ppv8Nd4SpXcsREPtv99yeYajq1b`, READY.
- Fuente GitHub `Edysael/PayVerify`, commit de aplicación `826fba4`.
- Alias https://payverify-nine.vercel.app apunta al deployment nuevo.
- Página raíz responde con la pantalla de inicio de sesión.
- No se detectaron errores runtime en el último periodo consultado.
- Git integration automática no está configurada; se hizo deployment manual desde GitHub.

## No certificado todavía
- Aceptación Android en teléfono físico.
- Checkout real con API key (crear orden, consultar estado, actualizar pistas).
- Captura y sincronización de SMS/notificación bancaria autorizada.
- Importación de cartola CSV real anonimizada y conciliación/deshacer.
- Plantillas bancarias con muestras reales.
- Prueba de roles/aislamiento en flujo real.
- APK release firmado y revisión legal/privacidad/políticas SMS.

## Conclusión
Build, CI, deployment, funciones y conciliación SQL están verificados. PayVerify aún no está certificado para lanzamiento comercial hasta completar aceptación Android, checkout y cartola bancaria. No declarar el producto terminado solo por CI verde.
