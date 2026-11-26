# Fase 3 — Registro de cambios

## Añadido
- Room compiler mediante KSP.
- Captura SMS estructurada a Room (local, sin red en receiver).
- Validaciones locales y mapeo mínimo de payload.
- Política de backoff de sincronización.
- Edge Function de ingesta con validación JWT, organización, dispositivo, payload e idempotencia.
- Migración SQL de índices, revocación de escrituras directas y auditoría de cambio de estado.
- Página web de pagos por organización y tipos de dominio.
- Exportador CSV con neutralización de fórmulas.
- Pruebas unitarias Android y prueba CSV (Vitest configurado).

## Límites que siguen abiertos
- El parser aún no extrae un timestamp de transacción validado; la captura usa hora de detección como aproximación. No debe interpretarse como hora bancaria.
- La clave de idempotencia móvil actual usa timestamp de detección y puede no deduplicar dos notificaciones repetidas en momentos distintos. Se debe ajustar con fingerprint estable del contenido estructurado (sin almacenar SMS).
- El receiver Room y la Edge Function aún requieren prueba de compilación e integración con un dispositivo real.
- No se completó el flujo de onboarding/registro de dispositivos ni el trabajador WorkManager de sincronización.
- La pantalla de pagos usa la organización activa más antigua como selección inicial; antes de producción debe añadirse selector de organización y sesión persistente correctamente protegida.
- No hay importador XLSX ni motor de conciliación automática en esta fase.

## Ajustes posteriores de esta fase
- Web auth usa cliente SSR basado en cookies, middleware de refresco y ruta `/auth/callback` para magic link.
- Android muestra configuración de remitente exacto y guarda allowlist local; no existe todavía selector multi-remitente ni gestión remota.


> Nota: este documento describe una fase histórica. El estado integrado y las funcionalidades actuales se encuentran en `docs/PHASES_1_TO_6.md` y `docs/PRODUCT_STATUS.md`.
