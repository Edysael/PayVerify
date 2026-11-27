#!/usr/bin/env python3
"""Idempotente: fija supabase-js@2 -> @2.49.1 en las Edge Functions (misma versión mínima que web/package.json)."""
import pathlib, re, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "supabase/functions")
pat = re.compile(r'(https://esm\.sh/@supabase/supabase-js)@2(["\'])')
n = 0
for p in sorted(root.rglob("*.ts")):
    s = p.read_text(); t = pat.sub(r'\1@2.49.1\2', s)
    if t != s: p.write_text(t); n += 1; print("fijado:", p)
print(f"{n} archivo(s) modificado(s)")
