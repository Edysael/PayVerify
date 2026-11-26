# Pendientes reales de PayVerify

Actualizado: 26 de noviembre de 2026. **No repitas la creación del repositorio, configuración inicial de Supabase ni publicación inicial del panel.** Ya están hechas.

## Hecho y verificado

- Repositorio privado `Edysael/PayVerify`.
- CI actual en success: https://github.com/Edysael/PayVerify/actions/runs/45896790057
- APK debug generado: artifact `15153483173`.
- Supabase PayVerify 0001–0008 aplicado.
- 13 Edge Functions activas; `device-approve` y `device-revoke` sincronizadas a v2.
- Cron de expiración activo cada 5 minutos.
- Hardening 0008 aplicado y verificado: 19 índices y políticas RLS de escritura separadas.
- Vercel production deployment `READY`; alias https://payverify-nine.vercel.app apunta al deployment nuevo.

## Pendiente para cerrar la aceptación

1. **Android físico:** instalar APK debug; validar OTP, conexión, enrolamiento/aprobación, permisos SMS/notificaciones, remitentes autorizados y sincronización.
2. **Checkout:** ejecutar `order-create`, `order-status` y `order-update` desde backend de prueba usando API key protegida; comprobar idempotencia, expiración y estados.
3. **Conciliación:** importar cartola CSV de prueba, revisar candidatos, conciliar y deshacer; confirmar que solo el extracto cambia a `paid_confirmed`.
4. **Plantillas bancarias:** recibir muestras anonimizadas (ocultar nombre, cédula y teléfono; conservar monto y referencia) y ajustar parsers.
5. **Seguridad/roles:** probar aislamiento multiempresa y permisos en entorno real.
6. **Release:** configurar firma Android, generar APK release, revisar privacidad/consentimiento y políticas de distribución SMS/notificaciones.

## Datos actuales de producción

- 2 organizaciones.
- 2 API keys activas.
- 0 órdenes, 0 eventos de pago y 0 líneas de extracto.
- No hay llamadas reales registradas a endpoints de checkout/órdenes.

La aplicación no se considera lista para lanzamiento comercial hasta completar los puntos 1–5 con resultados verificables. No modificar TomaYa, Mensajero Pro, APIs externas ni sistema contable.
