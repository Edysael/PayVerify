# Estado actual de PayVerify — 26 de noviembre de 2026

## Verificado directamente

- Panel de producción: `https://payverify-nine.vercel.app` responde.
- Endpoint `/api/health`: HTTP 200 y `environmentConfigured: true`.
- Proyecto Vercel `payverify`: último deployment de producción `READY`.
- Supabase `LEGAL TECH-IT API SERVICES` (`fzumtynskvcrybzejmbo`): migraciones PayVerify 0001–0006 registradas; migración 0007 aplicada durante la auditoría.
- 13 Edge Functions están `ACTIVE`. `order-create`, `order-update` y `order-status` tienen `verify_jwt=false` y usan la llave PayVerify; las funciones de operador requieren sesión.
- Dos organizaciones PayVerify y dos membresías activas de propietario.
- Dos llaves API activas pertenecen a la organización `TomaYa`; la segunda organización aún no tiene llave. El panel recibe permiso SELECT solo para metadatos permitidos; `key_hash` no es legible por `authenticated`. El secreto de las llaves no se almacena en texto plano y no se incluye en este paquete.
- `payverify-expire-orders` está activo con `*/5 * * * *`; la última ejecución registrada fue `succeeded`.
- `orders_total=0`, `payment_events_total=0` y `statement_lines_total=0` al momento de la auditoría.
- Los logs muestran dos respuestas `201` de `organization-create` y dos de `api-key-create`. No muestran llamadas a `order-create`, `order-update`, `order-status` ni `payment-event-ingest`.
- El panel de producción no reportó errores runtime en la ventana revisada.

## Ajuste de seguridad aplicado

Se aplicó `payverify_0007_revoke_public_trigger_execute`: revoca la ejecución directa por `PUBLIC`, `anon` y `authenticated` de las funciones trigger `payverify_sync_order_on_reconcile()` y `pv_log_payment_status_change()`. Las funciones siguen conectadas a sus triggers. La comprobación posterior confirmó que ya no tienen permiso `PUBLIC`.

El Security Advisor aún marca `pv_is_org_member(uuid)` y `pv_can_operate_org(uuid)` como funciones `SECURITY DEFINER` ejecutables por `authenticated`. Es intencional para las políticas RLS: ambas tienen `search_path=public`, usan `auth.uid()` y solo devuelven una comprobación booleana de membresía/rol. No se debe revocar su permiso a `authenticated` sin rediseñar las políticas.

## No certificado todavía

- No se ha completado una orden real desde el checkout hasta la consulta de estado.
- No hay pagos, eventos ni líneas de extracto en PayVerify.
- Android no está compilado ni instalado en un teléfono real.
- No se han configurado plantillas para los formatos reales de los bancos.
- No se ha probado conciliación con un extracto bancario real.
- No hay repositorio `PayVerify` visible en las cuentas GitHub conectadas; por eso no se ha ejecutado `PayVerify CI` ni descargado el APK.

## Próxima secuencia de aceptación

1. Crear un repositorio privado `PayVerify` y subir esta carpeta como raíz, conservando `.github/workflows/payverify-ci.yml`.
2. Ejecutar `Actions → PayVerify CI`; descargar `payverify-debug-apk` solo si el workflow queda verde.
3. Instalar el APK en un Android de prueba y autorizar las apps bancarias correspondientes.
4. Crear una orden de prueba con una de las llaves ya creadas, comprobar `order-status`, y hacer un Pago Móvil pequeño de prueba.
5. Importar un extracto de prueba y verificar que únicamente la conciliación cambia la orden a `paid_confirmed`.
6. Probar una muestra anonimizada de cada banco para ajustar sus plantillas.

No se modificó TomaYa ni Mensajero Pro durante esta auditoría.
