# Pendientes reales de PayVerify

Actualizado: 26 de noviembre de 2026. La configuración inicial ya está hecha: panel publicado, URL de autenticación configurada y dos organizaciones creadas. No repitas esos pasos.

## Completado y verificado

- Supabase: migraciones PayVerify 0001–0006 registradas y 0007 de hardening aplicada.
- Edge Functions: 13 activas.
- Cron `payverify-expire-orders`: activo cada 5 minutos; última ejecución exitosa.
- Panel Vercel: producción `READY`; `/api/health` responde 200.
- Dos organizaciones con propietario activo.
- Dos llaves API activas en la organización TomaYa; no se registraron órdenes ni pagos.
- `organization-create` y `api-key-create` tuvieron respuestas reales 201.

## Pendiente para cerrar el producto

1. **Repositorio y APK:** no existe un repositorio PayVerify visible en las cuentas GitHub conectadas. Crear un repo privado `PayVerify`, subir el contenido de este ZIP desde la raíz y ejecutar `Actions → PayVerify CI`. El workflow genera `payverify-debug-apk`.
2. **Android real:** instalar el APK, conceder acceso a notificaciones y probar SMS/notificaciones de bancos con un pago pequeño.
3. **Checkout real:** usar una llave API ya creada (o crear una nueva desde el panel si la llave original no se guardó) para llamar `order-create`, `order-update` y `order-status`. No publicar la llave en navegador ni enviarla por chat.
4. **Conciliación:** importar un extracto de prueba y comprobar `paid_confirmed`; un SMS o notificación nunca confirma fondos.
5. **Plantillas bancarias:** recibir ejemplos de notificaciones reales con nombre, cédula y teléfono ocultos, conservando monto y referencia.

## Límites de esta entrega

- La prueba de extremo a extremo de checkout y banco sigue pendiente.
- No se ha compilado ni probado el APK en dispositivo.
- La protección contra contraseñas filtradas debe revisarse en Supabase Auth si todavía no la activaste.
- No modificar TomaYa ni Mensajero Pro para completar estas pruebas.
