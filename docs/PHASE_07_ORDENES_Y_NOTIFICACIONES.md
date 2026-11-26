# Fase 7 — Órdenes, cruce automático y notificaciones de apps de bancos

## Qué se agregó
**Android**
- `PaymentCaptureProcessor`: un solo punto de entrada para SMS y notificaciones. Nunca guarda el texto del mensaje.
- `PaymentNotificationListener`: lee notificaciones de las apps de bancos que el comercio autorice (identificador `app:<paquete>`). Las apps no autorizadas solo dejan su nombre de paquete (sin texto) si el mensaje parece de dinero, para que el comercio las autorice con un toque.
- Parser mejorado: monto (miles/decimales, punto final), referencia (exige dígitos), teléfono emisor (completo o enmascarado), banco emisor (solo si el mensaje dice «desde/origen/emisor» o un código; el banco receptor que abre el mensaje NO se toma como emisor), rechazo de mensajes de salida/débito y de claves.
- Plantillas por banco (`SmsTemplate`): vacías a propósito hasta tener muestras reales. Sobrescriben solo lo que el parser genérico lea mal.
- Anti-duplicado entre canales (SMS + notificación del mismo pago) en el teléfono y en el servidor.
- Contador de mensajes de tus bancos que no se pudieron leer (sin guardar texto).
- Room v2 con migración aditiva.

**Supabase (migración `0005`, aditiva)**
- Columnas opcionales en `payment_events`: teléfono/banco emisor, canal, orden cruzada.
- `payverify_orders`, `payverify_api_keys`.
- `payverify_match_payment`: cruza un pago con una orden pendiente.
- `payverify_order_set_hints`: cuando el cliente informa su referencia DESPUÉS de que llegó la notificación.
- `payverify_order_action`: aprobar, rechazar cruce, vincular a mano, cancelar.
- `payverify_expire_orders`: vence órdenes (hay que llamarla desde un job; ver pendientes).
- Disparador: si el extracto concilia el pago, la orden pasa a «Confirmado» (y vuelve atrás si se deshace).

**Edge Functions**: `order-create`, `order-update`, `order-status`, `order-action`, `api-key-create` y `_shared/auth.ts`. `payment-event-ingest` ahora acepta pistas del pagador y cruza el pago con una orden.

**Panel web**: Órdenes, Pagos sin orden (con vinculación manual) y Llaves de API.

## Reglas de cruce (de más a menos segura)
1. Monto exacto + últimos dígitos de referencia informados por el cliente → **Pago detectado** (`reference`).
2. Monto exacto + últimos 4 del teléfono → **Pago detectado** (`amount_phone`).
3. Solo monto exacto y una única orden posible → **Requiere tu revisión** (`amount_only`). Nunca se aprueba solo.
4. Varias órdenes posibles sin dato que desempate → no se cruza; queda en «Pagos sin orden».
Además: el pago debe ser posterior a la creación de la orden y anterior a su vencimiento; si el cliente informó una referencia distinta, esa orden se descarta.

## Estados de una orden
`pending` → `paid_probable` (pago detectado y cruzado) → `paid_confirmed` (también conciliado con extracto). Aparte: `needs_review`, `expired`, `cancelled`.
**Un SMS o notificación nunca es prueba de fondos.** `paid_probable` permite entregar; `paid_confirmed` es lo único confirmado por el banco.

## Cómo conecta tu checkout (el del prototipo)
1. Crear llave en el panel (Llaves de API).
2. Al generar la orden: `POST /functions/v1/order-create` con header `x-payverify-key` y `{"externalRef":"ORD-2026","amountMinorUnits":117125,"description":"..."}`.
3. Cuando el cliente escribe su referencia: `POST /functions/v1/order-update` con `{"externalRef":"ORD-2026","referenceTail":"849201","customerPhoneLast4":"9812"}`.
4. Consultar cada pocos segundos: `POST /functions/v1/order-status` con `{"externalRef":"ORD-2026"}` → `paid`, `confirmedByStatement`, `needsReview`, `status`.
Todas llevan también el header `apikey` con la clave pública (anon) de Supabase.

## Convivencia con otras apps en el mismo proyecto Supabase
Todas las tablas, tipos y funciones auxiliares de PayVerify llevan el prefijo `pv_` (`pv_organizations`, `pv_devices`, `pv_payment_events`, `pv_is_org_member`…); las que ya empezaban con `payverify_` no cambian. Así se puede aplicar en el proyecto compartido LEGAL TECH-IT API SERVICES sin tocar `organizations`, `org_members`, `messages` ni `is_org_member` de Mensajero Pro. `supabase/tests/run.sh` simula esas tablas existentes, aplica las migraciones y verifica que lo anterior quede idéntico. Las Edge Functions conservan su nombre (el proyecto no tenía ninguna).
