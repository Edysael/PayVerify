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
for f in migrations/000*.sql; do echo "== $f"; $P -f "$f"; done
echo "== re-apply 0005 (must be idempotent)"; $P -f migrations/0005_orders_and_matching.sql
$P -f tests/0005_matching_test.sql
$P -f tests/0005_reconcile_e2e_test.sql
$P -f tests/0005_rls_test.sql
$P -f tests/0008_performance_indexes_test.sql
[ "${SIMULATE_SHARED:-1}" = 1 ] && $P -f tests/99_existing_untouched_test.sql
echo "SQL OK"
