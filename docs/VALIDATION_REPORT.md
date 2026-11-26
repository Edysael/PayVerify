# Validación de la entrega (fase 7)

> **Actualización de estado 26-nov-2026:** la sección histórica que sigue registra pruebas reportadas durante el desarrollo; no todas se repitieron en esta auditoría. En producción se verificó panel Vercel `READY`, `/api/health` HTTP 200, 13 Edge Functions `ACTIVE`, migraciones PayVerify 0001–0006 y 0007 registradas, cron de expiración activo y última ejecución `succeeded`. Logs reales confirmaron `organization-create` y `api-key-create` con HTTP 201 (dos veces cada una). No hay órdenes, eventos de pago ni líneas de extracto; los endpoints de órdenes no tienen llamadas registradas.

La migración 0007 revoca el permiso `PUBLIC` para ejecutar dos funciones trigger de PayVerify. No modifica objetos de Mensajero Pro/TomaYa.


## Ejecutado de verdad en este entorno
- **PostgreSQL 16 real**: migraciones 0001–0005 aplicadas desde cero; 0005 re-aplicable sin error (idempotente).
- **17 escenarios SQL de cruce** (`supabase/tests/0005_matching_test.sql`): referencia, teléfono, solo monto, ambigüedad, pago anterior a la orden, vinculación manual, monto distinto rechazado, extracto concilia/deshace, usuario ajeno rechazado, un pago no vincula dos órdenes, duplicados no cruzan, vencimiento, pista tardía del cliente.
- **Extremo a extremo con las funciones de conciliación de 0003/0004** (hasta ahora nunca ejecutadas): pago → orden → línea de extracto conciliada → orden confirmada → deshacer → vuelve a «pago detectado».
- **Permisos (RLS)**: un usuario ve solo su organización; no puede escribir órdenes ni llamar funciones internas; `key_hash` de las llaves no se puede leer; `anon` no lee nada.
- **Parser**: 24 casos compilados con Kotlin 2.0.21 y ejecutados (montos, teléfono, banco emisor, salidas/débitos, claves, plantilla).
- **Panel web**: el deployment de producción está `READY`; `/api/health` responde HTTP 200 con `environmentConfigured=true`. Las 12 pruebas y el build local se reportan en la validación anterior; no se pudieron repetir aquí porque faltan dependencias locales.
- **Edge Functions**: 13 funciones desplegadas y `ACTIVE`. `organization-create` y `api-key-create` tuvieron llamadas reales exitosas; los endpoints de órdenes y de ingestión aún no tienen llamadas registradas.
- **Supabase real**: migraciones 0001–0007 aplicadas y 0007 de hardening aplicada; las tablas PayVerify tienen RLS y `anon` no tiene permisos sobre ellas. Los objetos de Mensajero Pro/TomaYa no se modificaron en esta auditoría.

- **Convivencia con el proyecto compartido**: se simularon las tablas reales de Mensajero Pro (leídas en solo lectura). Con los nombres originales las migraciones fallaban y habrían sobrescrito `is_org_member`; con el prefijo `pv_` pasan y lo existente queda intacto.

## Problema encontrado y corregido
- El panel web entregado antes **no compilaba**: `@supabase/ssr 0.6.1` es incompatible con el `supabase-js` actual (errores de tipos). Se actualizó a `@supabase/ssr 0.12.7`. `next build` ya compila.

## NO ejecutado (no hay forma de hacerlo aquí)
- **Compilación Android y APK**: no hay Android SDK ni Gradle instalados en este entorno; la compilación debe ejecutarse con `PayVerify CI` en GitHub. El parser sí se compiló y probó aparte; el servicio de notificaciones, la pantalla y Room **no se han compilado**. El flujo `.github/workflows/payverify-ci.yml` compila y prueba todo en GitHub (primera ejecución pendiente; puede requerir ajustes).
- **Prueba de extremo a extremo de órdenes/pagos**: no se ha ejecutado. Las funciones están desplegadas, pero falta llamada real de checkout y conciliación.
- **Prueba en teléfono real** con notificaciones o SMS reales de bancos.
- **Plantillas de bancos reales**: no hay muestras; el parser genérico puede fallar en formatos reales.
- Pentest, revisión legal y política de Google Play para SMS.
