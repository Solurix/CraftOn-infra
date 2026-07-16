#!/usr/bin/env bash
#
# api.sh — tiny authenticated curl client for smoke-testing the CRAFT-ON API,
# locally or against a preview. Uses the fake-auth bearer token (base64url JSON),
# which matches the API's fake verifier (CRAFTON_AUTH_MODE=fake).
#
# Target a different API with CRAFTON_API, e.g.:
#   CRAFTON_API=https://crafton-api-dev-pr42-...run.app scripts/api.sh get /api/v1/...
#
# Usage:
#   scripts/api.sh token [<phone>]              # print a fake bearer token
#   scripts/api.sh get   <path> [<phone>]       # authenticated GET
#   scripts/api.sh post  <path> <json> [<phone>]# authenticated POST
#   scripts/api.sh raw   <path>                 # unauthenticated GET (e.g. /readyz)
#
set -uo pipefail

API="${CRAFTON_API:-http://localhost:58000}"
DEFAULT_PHONE="+819012345678"

fake_token() {
  local phone="$1"
  # base64url(JSON) with padding stripped — mirrors app.core.auth.make_fake_token.
  printf '{"uid":"fake-%s","phone_number":"%s"}' "$phone" "$phone" \
    | base64 | tr '+/' '-_' | tr -d '=\n'
}

cmd="${1:-}"; shift || true
case "$cmd" in
  token)
    fake_token "${1:-$DEFAULT_PHONE}"
    ;;
  raw)
    curl -sS "$API$1"; echo
    ;;
  get)
    path="$1"; phone="${2:-$DEFAULT_PHONE}"
    curl -sS -H "Authorization: Bearer $(fake_token "$phone")" "$API$path"; echo
    ;;
  post)
    path="$1"; body="$2"; phone="${3:-$DEFAULT_PHONE}"
    curl -sS -X POST -H "Authorization: Bearer $(fake_token "$phone")" \
      -H "Content-Type: application/json" -d "$body" "$API$path"; echo
    ;;
  *)
    echo "usage: scripts/api.sh {token|raw|get|post} ..." >&2
    exit 2
    ;;
esac
