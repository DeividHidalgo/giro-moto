#!/usr/bin/env bash
# Runs the RLS tests against a THROW-AWAY local PostgreSQL (needs psql + a server you can create databases on).
# Usage: PGHOST=localhost PGUSER=postgres tests/sql/run.sh
# Safety: refuses to run against anything that looks like Supabase.
set -euo pipefail
cd "$(dirname "$0")"
case "${PGHOST:-localhost}" in *supabase*) echo "Refusing to run against Supabase." >&2; exit 1;; esac
DB="giro_rls_test_$$"
createdb "$DB"; trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f auth-stub.sql -f ../../sql/schema.sql >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -tA -f rls.test.sql 2>&1 | grep -E "^(ok|FAIL|ALL)|ERROR" | sed "s/^/  /"
