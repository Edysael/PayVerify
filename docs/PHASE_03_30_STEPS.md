# PayVerify — Fase 3: pasos 31–60

Esta fase añade persistencia local, endurecimiento de la ingesta, controles de acceso y primeras vistas operativas. Es una implementación de desarrollo; requiere pruebas y configuración antes de producción.

## Paso 31. Persistencia real local

Room: guardar eventos estructurados y observarlos desde DAO; confirmar migraciones antes de publicar.

## Paso 32. Room code generation

Configurar KSP y Room compiler para generar la implementación de la base.

## Paso 33. Captura consentida

Receiver exige capture_enabled, permiso SMS y allowlist explícita.

## Paso 34. Procesamiento sin red

El receiver procesa localmente; no transmite el texto SMS ni lo registra.

## Paso 35. Filtro de remitentes

Comparación exacta con remitentes autorizados; evitar coincidencias parciales.

## Paso 36. Parser defensivo

Rechaza OTP/seguridad, mensajes que no indiquen abono y datos incompletos.

## Paso 37. Conversión monetaria

Monto a unidades menores con redondeo explícito; revisar formatos por banco.

## Paso 38. Estados claros

Etiquetas de detección, extracción, recepción, revisión y conciliación.

## Paso 39. Reglas de datos

Validar monto positivo y referencia de longitud/caracteres permitidos.

## Paso 40. Mapeo de payload

Mapper excluye campos personales y texto original del SMS.

## Paso 41. Política de reintentos

Backoff exponencial con límite para errores temporales.

## Paso 42. Contrato de sincronización

Payload mínimo y respuesta tipada; sin API key bancaria.

## Paso 43. Autenticación de usuario

Edge Function valida JWT con Auth antes de aceptar eventos.

## Paso 44. Membresía de organización

Backend comprueba membresía activa en la organización objetivo.

## Paso 45. Dispositivo activo

Backend valida dispositivo registrado, activo y perteneciente al usuario.

## Paso 46. Validación de payload

UUID, referencia, moneda, cantidad y timestamp con límites.

## Paso 47. Idempotencia de servidor

Clave única por organización; repetición devuelve evento existente.

## Paso 48. Persistencia confiable

Solo función de backend usa service role; nunca exponerlo al cliente.

## Paso 49. RLS endurecida

Revocar escrituras directas a pagos, dispositivos y auditoría.

## Paso 50. Auditoría de estados

Trigger registra cambio de estado sin almacenar SMS.

## Paso 51. Índices de consultas

Índices por organización, estado, fecha y dispositivos.

## Paso 52. Listado de pagos

Página consulta solo organización activa y limita resultados a 100.

## Paso 53. Etiquetas de estados web

Mapa de estados consistente y sin crear BANK_CONFIRMED.

## Paso 54. Exportación CSV segura

Exportar columnas explícitas y neutralizar fórmulas de spreadsheet.

## Paso 55. Filtros tipados

Contrato de filtros por estado, fechas, referencia y rango de monto.

## Paso 56. Manejo de errores

Mensajes genéricos; no mostrar secretos ni texto de SMS.

## Paso 57. Pruebas de reglas locales

Pruebas de referencia, montos y estados desconocidos.

## Paso 58. Pruebas de política sync

Pruebas de backoff y clasificación de errores retryable/terminal.

## Paso 59. Documentación de límites

Documentar timestamp estimado, formatos bancarios y estados no definitivos.

## Paso 60. Checklist de liberación

No declarar listo sin build, pruebas Android, RLS revisada y prueba end-to-end.

