# Fase 4 — plan de pruebas

## Ejecutables localmente
- Android unit test: `PaymentFingerprintTest`.
- Web unit test: `candidates.test.ts` mediante Vitest si las dependencias están instaladas.

## Pruebas obligatorias antes de staging
1. Verificar que fingerprint sea determinista tras normalizar referencia y remitente.
2. Confirmar que ninguna función de fingerprint recibe cuerpo de SMS ni OTP.
3. Aplicar `0003_statement_reconciliation.sql` en un proyecto Supabase aislado.
4. Probar RLS con dos organizaciones y usuarios sin membresía cruzada.
5. Probar duplicación de importación por hash de archivo y fingerprint de línea.
6. Probar CSV malformado, filas excesivas, fechas inválidas y montos negativos.
7. Confirmar que un candidato no modifica el estado del pago.
8. Confirmar que conciliación requiere autorización, revisión explícita y auditoría.
9. Probar revocación de dispositivo y reintentos idempotentes cuando se complete el worker.
10. Ejecutar build web y Gradle; instalar en dispositivo de prueba con SMS sintético.

## Criterio de aceptación
La coincidencia automática solo sugiere. El estado `RECONCILED` requiere match contra movimiento de extracto y confirmación explícita por un usuario autorizado. SMS por sí solo nunca verifica fondos.


> Nota: este documento describe una fase histórica. El estado integrado y las funcionalidades actuales se encuentran en `docs/PHASES_1_TO_6.md` y `docs/PRODUCT_STATUS.md`.
