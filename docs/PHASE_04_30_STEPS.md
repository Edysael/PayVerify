# PayVerify — Fase 4: pasos 61–90

Esta entrega agrega una base para deduplicación estructurada y conciliación con extractos. Código de desarrollo: revisar migraciones, compilar y probar en un proyecto Supabase de prueba antes de aplicar en producción.

## Paso 61. Fingerprint estructurado
Clave SHA-256 estable a partir de monto, moneda, referencia, hora de operación y remitente normalizado. No usa el cuerpo del SMS.

## Paso 62. Pruebas de fingerprint
Pruebas de normalización y cambio de monto; verificar colisiones lógicas con casos de bancos reales sanitizados.

## Paso 63. Contrato de extractos
Separar lote de importación y líneas de extracto; conservar hash del archivo para evitar importar dos veces el mismo archivo.

## Paso 64. Tabla de lotes
Registrar organización, usuario, hash, conteos y estado del proceso.

## Paso 65. Tabla de líneas
Guardar fecha, monto firmado, moneda, referencia opcional y descripción redactada; no almacenar datos de cuenta completos.

## Paso 66. Restricción de duplicados de extracto
Unique por organización y fingerprint de línea.

## Paso 67. RLS de extractos
Lectura por miembros activos; escrituras reservadas a proceso backend autorizado.

## Paso 68. Índices de conciliación
Índices por organización, fecha, estado, monto y moneda.

## Paso 69. Hash de archivo
SHA-256 del archivo de extracto original calculado en el cliente o backend; nunca se usa como prueba de autenticidad bancaria.

## Paso 70. Validación CSV
Validar encabezados, número de columnas, fechas, moneda, monto y límite de filas; rechazar filas ambiguas.

## Paso 71. Importación con vista previa
Mostrar conteos y errores antes de confirmar; no crear conciliaciones durante la previsualización.

## Paso 72. Límites de importación
Tamaño y filas máximas configurables; detener procesamiento ante archivo excesivo.

## Paso 73. Descripción redactada
Aplicar lista de campos permitidos; evitar guardar saldo, número de cuenta completo o información personal innecesaria.

## Paso 74. Motor de candidatos
Proponer coincidencias por monto absoluto, moneda, referencia y ventana temporal; resultado es candidato, nunca conciliado automáticamente.

## Paso 75. Coincidencia exacta de referencia
Si la referencia está disponible, priorizarla; referencia vacía no permite match automático.

## Paso 76. Tolerancia temporal
Configurar ventana de conciliación por zona horaria y banco; no asumir que SMS y extracto usan la misma hora.

## Paso 77. Duplicados potenciales
Detectar más de una línea/evento compatible y marcar revisión ambigua.

## Paso 78. Revisión humana
La conciliación requiere acción explícita de un usuario con rol autorizado.

## Paso 79. Auditoría de conciliación
Registrar quién, cuándo, línea y evento vinculó, y motivo de desvinculación.

## Paso 80. Deshacer conciliación
Permitir revertir el vínculo con auditoría, sin borrar el extracto ni el evento.

## Paso 81. Selector de organización
Evitar seleccionar automáticamente la primera membresía; requerir organización activa explícita.

## Paso 82. Enrolamiento de dispositivo
Estados pending/active/revoked y aprobación de administrador; no confiar en un identificador autodeclarado como secreto.

## Paso 83. Revocación
Detener sincronización del dispositivo revocado y eliminar tokens locales según política.

## Paso 84. Worker de sincronización
Enviar lotes pequeños, respetar conectividad y backoff, actualizar estado por resultado del servidor.

## Paso 85. Reintentos idempotentes
Reusar el mismo identificador/fingerprint estructurado en cada reintento.

## Paso 86. Errores tipados
Distinguir retryable, rejected, unauthorized y duplicate; no reintentar errores permanentes indefinidamente.

## Paso 87. Observabilidad mínima
Métricas sin SMS: conteos, latencia, fallos por código y versión de app.

## Paso 88. Exportación de conciliación
CSV con campos explícitos y protección contra formula injection; no exportar identificadores sensibles innecesarios.

## Paso 89. Pruebas de seguridad
Verificar aislamiento multiempresa, permisos por rol, replay, revocación, importación malformada y duplicados.

## Paso 90. Gate de liberación
No publicar hasta completar build Android/web, migración en staging, pruebas E2E, revisión RLS y validación legal/privacidad.
