# Pendientes reales de PayVerify

Actualizado: 26 de noviembre de 2026. **No repitas la creación del repositorio, la configuración inicial de Supabase ni la publicación inicial del panel.** Esos pasos ya existen.

## Hecho y verificado

- Repositorio privado `Edysael/PayVerify`, rama `main`.
- CI verde en web, APK debug Android y SQL: https://github.com/Edysael/PayVerify/actions/runs/45896340341
- Supabase PayVerify 0001–0008 aplicado.
- 13 Edge Functions activas; `device-approve` y `device-revoke` sincronizadas a versión 2.
- Cron de vencimiento activo cada 5 minutos.
- Hardening 0008: 19 índices y políticas RLS de escritura separadas; verificación de producción correcta.
- Panel Vercel producción `READY`, alias https://payverify-nine.vercel.app, sin errores runtime detectados en 7 días.

## Pendiente para cerrar la aceptación

1. **Publicación web actual:** desplegar el commit más reciente desde GitHub en el proyecto Vercel existente y verificar el alias de producción y `/api/health`.
2. **Android físico:** instalar el APK debug actual; validar OTP, conexión, enrolamiento y aprobación del dispositivo, permisos SMS/notificaciones, remitentes autorizados y sincronización.
3. **Checkout:** ejecutar `order-create`, `order-status` y `order-update` desde un backend de prueba usando una API key protegida. Confirmar idempotencia, expiración y estados.
4. **Conciliación:** importar una cartola CSV de prueba, revisar candidatos, conciliar y deshacer; comprobar que solo el extracto cambia el estado a `paid_confirmed`.
5. **Plantillas bancarias:** recibir muestras anonimizadas (ocultar nombre, cédula y teléfono; conservar monto y referencia) para ajustar parsers.
6. **Release:** configurar firma Android, generar APK release, revisar privacidad/consentimiento y políticas de distribución de SMS/notificaciones.

## Datos actuales de producción

- 2 organizaciones.
- 2 API keys activas.
- 0 órdenes, 0 eventos de pago y 0 líneas de extracto.
- No se han registrado llamadas reales a los endpoints de checkout/órdenes.

No se considera PayVerify listo para lanzamiento comercial hasta completar los puntos 2–5 con resultados verificables. No modificar TomaYa, Mensajero Pro, APIs externas ni sistema contable.
