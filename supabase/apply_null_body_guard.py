#!/usr/bin/env python3
"""Idempotente: en order-create/order-status/order-update, un cuerpo JSON 'null' devuelve 400 invalid_json en vez de lanzar TypeError (500)."""
import pathlib, sys
ANCHOR = 'try { b = await req.json(); } catch { return out(400, { error: "invalid_json" }); }\n'
GUARD = '  if (!b || typeof b !== "object" || Array.isArray(b)) return out(400, { error: "invalid_json" });\n'
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "supabase/functions")
for name in ("order-create", "order-status", "order-update"):
    p = root / name / "index.ts"
    s = p.read_text()
    if GUARD in s: print(name, "ya tenía la guarda"); continue
    assert s.count(ANCHOR) == 1, f"{name}: no encuentro la línea esperada"
    p.write_text(s.replace(ANCHOR, ANCHOR + GUARD)); print(name, "parcheado")
