# Cómo aplicar este paquete

> La migración 0009 y las funciones `statement-import` y `payment-reconcile` **ya están aplicadas en producción** (ver `docs/AUDITORIA_2026-11-26.md`). Este paquete es para llevar el mismo código al repo y sumar el resto (CI, cabeceras, scripts, pruebas, docs).

1. Copia el contenido de esta carpeta sobre la raíz del repo (las rutas ya coinciden).
2. Desde la raíz del repo, en tu rama (**no en `main`**; Vercel despliega desde main), ejecuta:
   ```bash
   python3 supabase/apply_null_body_guard.py
   python3 supabase/pin_supabase_js.py
   bash supabase/tests/functions/run.sh      # necesita Node 22
   ```
   Los dos scripts son idempotentes y modifican los archivos reales del repo. El CI (`edge-functions`) falla si no aplicaste el primero.
3. Haz commit, sube la rama y abre el PR. Revisa los checks `sql`, `web`, `android-apk` y `edge-functions`.
4. Solo si todo pasa: aplica `0009_reconciliation_hardening.sql` en staging, luego en producción, y redespliega `statement-import`, `payment-reconcile` y las funciones `order-*`.

Archivos:
- supabase/migrations/0009_reconciliation_hardening.sql (nuevo)
- supabase/tests/0009_reconciliation_hardening_test.sql (nuevo)
- supabase/tests/functions/* (nuevo)
- supabase/tests/run.sh (modificado)
- supabase/apply_null_body_guard.py, supabase/pin_supabase_js.py (nuevos, se ejecutan una vez)
- supabase/functions/statement-import/index.ts, payment-reconcile/index.ts (modificados)
- .github/workflows/payverify-ci.yml (modificado)
- web/next.config.ts (modificado)
- docs/DEPLOYMENT.md (modificado), docs/AUDITORIA_2026-11-26.md (nuevo)
