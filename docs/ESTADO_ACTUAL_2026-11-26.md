# Estado actual de PayVerify — 26 de noviembre de 2026

## Código y CI verificados

- Repositorio privado: https://github.com/Edysael/PayVerify
- Rama: `main`
- Commit auditado: `0862eb6065c63858192769bef8658d0728432b29`
- CI: https://github.com/Edysael/PayVerify/actions/runs/45896340341
- Resultado: **success** en los tres jobs:
  - `web`: `npm ci`, pruebas Vitest y `next build`.
  - `android-apk`: `testDebugUnitTest` y `assembleDebug`.
  - `sql`: migraciones y pruebas SQL en PostgreSQL 16.
- El CI genera `payverify-debug-apk`. Es un APK debug, no una versión release firmada.

## Supabase de producción

Proyecto `LEGAL TECH-IT API SERVICES` — ref `fzumtynskvcrybzejmbo`.

- Migraciones PayVerify 0001–0008 registradas.
- 13 Edge Functions en estado `ACTIVE`.
- `device-approve` y `device-revoke` están en versión 2; el código desplegado coincide con GitHub y ambas requieren JWT.
- `payverify-expire-orders` está activo con calendario `*/5 * * * *`.
- Conteos verificados: 2 organizaciones, 2 API keys activas, 0 órdenes, 0 eventos de pago y 0 líneas de extracto.

### Hardening aplicado (0008)

- Se agregaron 19 índices de soporte para claves foráneas de PayVerify.
- Se reemplazaron las políticas redundantes `*_operator_all` de bancos y remitentes por políticas INSERT/UPDATE/DELETE separadas.
- Se conservaron las políticas SELECT de miembros y los permisos de escritura de owner/admin/operator.
- Verificación posterior: 19/19 índices presentes, 0 políticas antiguas y 3 políticas de escritura por cada tabla.
- El advisor ya no reporta claves foráneas de PayVerify sin índice ni las dos políticas SELECT redundantes.
- Permanecen dos avisos sobre `pv_is_org_member(uuid)` y `pv_can_operate_org(uuid)` como funciones `SECURITY DEFINER` ejecutables por authenticated. Se usan deliberadamente en RLS para comprobar membresía/rol; no revocar sin rediseñar las políticas.
- Los avisos de índices no usados son esperables mientras las tablas de PayVerify estén vacías.

## Panel Vercel

- Proyecto: `payverify`.
- Alias de producción: https://payverify-nine.vercel.app
- Deployment consultado: `dpl_9B69Ax3xejaLq22pAA1BehPWKfdW`, estado `READY`.
- No se encontraron errores runtime en los últimos 7 días.
- El proyecto Vercel no está vinculado automáticamente al repositorio GitHub; el deployment consultado era anterior al commit auditado. Se debe publicar la versión actual desde el repositorio y comprobar que el alias de producción apunte a ella.

## No certificado todavía

- Prueba de aceptación completa en un teléfono Android físico.
- Checkout real: crear una orden con API key, consultar estado y actualizar pistas del cliente.
- Captura y sincronización de una notificación/SMS bancario real autorizado.
- Importación de cartola CSV de prueba y conciliación/deshacer con un movimiento real anonimizado.
- Plantillas ajustadas a formatos bancarios reales.
- Prueba de aislamiento multiempresa y roles contra el entorno de producción.
- APK release firmado, revisión legal/privacidad y evaluación de las políticas de distribución relacionadas con SMS/notificaciones.

## Conclusión

El código compila y las pruebas automatizadas de web, Android y SQL pasan. Supabase está instalado y el hardening 0008 está aplicado. Sin embargo, PayVerify **no está certificado para producción comercial** hasta completar los flujos de aceptación con checkout, extracto bancario y dispositivo físico. No declarar el producto terminado solo por tener CI verde.
