# Estado actual de PayVerify — 26 de noviembre de 2026

## Código y CI

- Repositorio privado: https://github.com/Edysael/PayVerify
- Rama `main`; código de aplicación publicado desde commit `826fba46c10a5a84176861d5f36ed051619de468`.
- CI: https://github.com/Edysael/PayVerify/actions/runs/45896790057
- Resultado final: **success** en `web`, `android-apk` y `sql`.
- Web: `npm ci`, Vitest y `next build`.
- Android: `testDebugUnitTest` y `assembleDebug`.
- SQL: migraciones y pruebas en PostgreSQL 16.
- APK debug: artifact `15153483173`, aproximadamente 9.7 MB. No es una versión release firmada.

## Supabase de producción

Proyecto `LEGAL TECH-IT API SERVICES`, ref `fzumtynskvcrybzejmbo`.

- Migraciones PayVerify 0001–0008 registradas.
- 13 Edge Functions en estado `ACTIVE`.
- `device-approve` y `device-revoke` están en versión 2; se comprobó que su código desplegado coincide con GitHub y ambas requieren JWT.
- `payverify-expire-orders` activo cada 5 minutos.
- Conteos actuales: 2 organizaciones, 2 API keys activas, 0 órdenes, 0 eventos de pago y 0 líneas de extracto.

### Hardening 0008 aplicado y verificado

- 19 índices de soporte para claves foráneas de PayVerify.
- Políticas redundantes `*_operator_all` de bancos y remitentes reemplazadas por políticas INSERT/UPDATE/DELETE separadas.
- Se conservan SELECT para miembros y permisos de escritura owner/admin/operator.
- Verificación en producción: 19/19 índices presentes, 0 políticas antiguas, 3 políticas de escritura por cada tabla.
- Advisor ya no reporta FKs de PayVerify sin índice ni las políticas SELECT redundantes.
- Permanecen avisos sobre `pv_is_org_member(uuid)` y `pv_can_operate_org(uuid)` como `SECURITY DEFINER` ejecutables por authenticated. Son usadas deliberadamente por RLS; no revocar sin rediseñar la autorización.
- Avisos de índices no usados son esperables mientras las tablas estén vacías.

## Panel Vercel

- Proyecto: `payverify`.
- Deployment de producción: `dpl_3ppv8Nd4SpXcsREPtv99yeYajq1b`, estado `READY`.
- Fuente GitHub: `Edysael/PayVerify`, rama `main`, commit de aplicación `826fba4`.
- Alias de producción https://payverify-nine.vercel.app confirmado apuntando al deployment nuevo.
- No se detectaron errores runtime en los 7 días revisados.
- El proyecto no está enlazado para deploy automático con GitHub; esta publicación se realizó manualmente desde la fuente. Los próximos cambios de código deben desplegarse o configurarse con Git integration.

## No certificado todavía

- Aceptación completa en teléfono Android físico.
- Checkout real: crear orden con API key, consultar estado y actualizar pistas del cliente.
- Captura y sincronización de SMS/notificación bancaria real autorizada.
- Importar cartola CSV de prueba y conciliar/deshacer con un movimiento anonimizado.
- Plantillas ajustadas a formatos bancarios reales.
- Prueba de aislamiento multiempresa y roles en el entorno de producción.
- APK release firmado, revisión legal/privacidad y evaluación de políticas de distribución SMS/notificaciones.

## Conclusión

El código compila y las pruebas automatizadas web, Android y SQL pasan. Supabase está instalado y hardening 0008 aplicado. El panel se publicó desde el commit de aplicación actual y el alias apunta a esa versión.

PayVerify **no está certificado para lanzamiento comercial** hasta completar los flujos de aceptación con checkout, extracto bancario y dispositivo físico. No declarar el producto terminado solo por tener CI verde.
