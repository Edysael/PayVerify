#!/usr/bin/env bash
# Pruebas de lógica de Edge Functions con clientes simulados (sin red, sin Deno).
# Verifican la lógica del código, NO el comportamiento real de PostgREST ni de la base de datos.
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# 1) statement-import
sed -E 's#https://esm.sh/@supabase/supabase-js@[0-9.]+#./supabase-stub.mjs#' ../../functions/statement-import/index.ts > "$tmp/si.ts"
cp supabase-stub.mjs statement-import.test.mjs "$tmp/"
node --experimental-strip-types "$tmp/statement-import.test.mjs"

# 2) order-create / order-status / order-update con cuerpo JSON no-objeto
mkdir -p "$tmp/functions/_shared"
cp auth-stub.ts "$tmp/functions/_shared/auth.ts"
cp null-body.test.mjs "$tmp/"
for fn in order-create order-status order-update; do
  mkdir -p "$tmp/functions/$fn"; cp "../../functions/$fn/index.ts" "$tmp/functions/$fn/index.ts"
  node --experimental-strip-types "$tmp/null-body.test.mjs" "$fn"
done

# 3) Pruebas fn-<función>.test.mjs: cada una importa ./<función>.ts (la función con supabase-js simulado).
for t in fn-*.test.mjs; do
  [ -e "$t" ] || continue
  fn=${t#fn-}; fn=${fn%.test.mjs}
  sed -E 's#https://esm.sh/@supabase/supabase-js@[0-9.]+#./supabase-stub.mjs#' "../../functions/$fn/index.ts" > "$tmp/$fn.ts"
  cp "$t" "$tmp/"
  node --experimental-strip-types "$tmp/$t"
done
