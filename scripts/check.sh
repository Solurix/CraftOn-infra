#!/usr/bin/env bash
#
# check.sh — run the full quality gate (lint + type-check + tests) for the
# CRAFT-ON monorepo. Everything runs *inside Docker* so it works with zero local
# install: no Python venv, no node_modules on the host. This is the canonical
# "does it actually work?" command — `make check` and CI both call it, so
# local == CI.
#
# Usage:
#   scripts/check.sh         # check both api and web
#   scripts/check.sh api     # backend only (ruff + mypy + i18n + migrations + pytest)
#   scripts/check.sh web     # frontend only (i18n + eslint + tsc + vitest + build)
#
set -uo pipefail

cd "$(dirname "$0")/.."

target="${1:-all}"
fail=0

# The api gate runs against a throwaway `crafton_test` database on the compose db
# service, so it never clobbers a running dev stack's data.
API_TEST_DB_URL="postgresql+psycopg://crafton:crafton@db:5432/crafton_test"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
red() { printf '\033[31m%s\033[0m\n' "$1"; }

run_step() {
  local name="$1"; shift
  bold "▶ $name"
  if "$@"; then
    green "✓ $name passed"
  else
    red "✗ $name FAILED"
    fail=1
  fi
  echo
}

check_api() {
  bold "▶ api: starting postgres (checks use the crafton_test database)"
  if ! docker compose up -d --wait db; then
    red "✗ could not start the db service"
    fail=1
    return
  fi
  # Create the isolated test DB if it doesn't exist yet (idempotent).
  docker compose exec -T db sh -c \
    "psql -U crafton -d crafton -tAc \"SELECT 1 FROM pg_database WHERE datname='crafton_test'\" \
     | grep -q 1 || createdb -U crafton crafton_test" >/dev/null 2>&1

  # Mirrors .github/workflows/ci.yml: ruff, mypy, i18n parity, single migration
  # head, upgrade/downgrade round-trip, then pytest. The api image ships only
  # runtime deps, so install the [dev] extra (ruff, mypy, pytest) first.
  run_step "api: ruff + mypy + i18n + migrations + pytest" \
    docker compose run --rm --no-deps \
      -e CRAFTON_ENV=ci -e CRAFTON_AUTH_MODE=fake \
      -e CRAFTON_DATABASE_URL="$API_TEST_DB_URL" \
      api sh -c \
      "pip install -q -e '.[dev]' && \
       ruff check . && \
       mypy app && \
       python -m app.core.i18n --check && \
       test \"\$(alembic heads 2>/dev/null | grep -c '(head)')\" -eq 1 && \
       alembic upgrade head && \
       alembic downgrade base && \
       pytest -q"
}

check_web() {
  # node_modules lives in a named volume; install only if missing, then run the
  # same steps CI does: i18n parity, lint, type-check, vitest, and next build.
  run_step "web: i18n + eslint + tsc + vitest + build" \
    docker compose run --rm --no-deps web sh -c \
      "[ -x node_modules/.bin/vitest ] || npm ci; \
       npm run i18n:check && npm run lint && npm run typecheck && npm test && npm run build"
}

case "$target" in
  api) check_api ;;
  web) check_web ;;
  all) check_api; check_web ;;
  *) red "Unknown target '$target' (expected: api | web | all)"; exit 2 ;;
esac

if [ "$fail" -eq 0 ]; then
  green "ALL CHECKS PASSED"
else
  red "CHECKS FAILED"
fi
exit "$fail"
