#!/usr/bin/env bash
# Applies all PayVerify migrations on a scratch PostgreSQL database and runs the SQL tests.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=pv_test_$$
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
P="psql -v ON_ERROR_STOP=1 -q -d $DB"
$P -f tests/00_supabase_stub.sql
[ "${SIMULATE_SHARED:-1}" = 1 ] && $P -f tests/01_existing_shared_project.sql
for f in migrations/[0-9][0-9][0-9][0-9]_*.sql; do echo "== $f"; $P -f "$f"; done
# Desde 0009 todas las migraciones deben ser idempotentes: se vuelven a aplicar.
for f in migrations/0005_*.sql migrations/0009_*.sql migrations/001[0-9]_*.sql; do
  [ -e "$f" ] || continue; echo "== re-apply $f (must be idempotent)"; $P -f "$f"
done
for f in tests/[0-9][0-9][0-9][0-9]_*_test.sql; do echo "== $f"; $P -f "$f"; done
[ "${SIMULATE_SHARED:-1}" = 1 ] && $P -f tests/99_existing_untouched_test.sql
echo "SQL OK"
