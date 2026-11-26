# Fase 4 — cambios (pasos 61–90)

- `PaymentFingerprint.kt`: clave estable SHA-256 de campos estructurados; no recibe el SMS original.
- `PaymentFingerprintTest.kt`: normalización y sensibilidad al monto.
- `0003_statement_reconciliation.sql`: tablas para lotes/filas de extractos, restricciones, índices y RLS.
- `web/src/lib/reconciliation/candidates.ts`: encuentra candidatos exactos por monto, moneda, referencia y ventana temporal; no confirma conciliación.
- `candidates.test.ts`: pruebas de candidato único, referencia vacía y ambigüedad.
- `docs/PHASE_04_30_STEPS.md`: planificación detallada de los pasos 61–90.

No se conectó una sincronización real ni se ejecutó la migración sobre un proyecto remoto. No se modificaron las APIs preexistentes ni el sistema contable.


> Nota: este documento describe una fase histórica. El estado integrado y las funcionalidades actuales se encuentran en `docs/PHASES_1_TO_6.md` y `docs/PRODUCT_STATUS.md`.
