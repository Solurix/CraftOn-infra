# crafton-web

Web/PWA frontend for **CRAFT-ON** — on-demand spot matching for construction
tradespeople in Japan. Mobile-first, installable **PWA** (workers + contractors)
with a gated `/admin` area.

Next.js (App Router, TypeScript), next-intl (ja default + full en), a typed API
client generated from the backend's OpenAPI, and Firebase phone-OTP auth (with a
fake mode for dev/CI/E2E).

> Product/spec source of truth is the [`crafton`](../crafton) repo. The backend
> is [`crafton-api`](../crafton-api); this app talks to it over REST.

## Quickstart

```bash
npm install
cp .env.example .env.local         # point NEXT_PUBLIC_API_BASE_URL at crafton-api
npm run gen:api                    # regenerate src/lib/api/schema.ts from openapi.snapshot.json
npm run dev                        # http://localhost:3000
```

Run the backend (`crafton-api`) on :8000 first. In dev, `NEXT_PUBLIC_AUTH_MODE=fake`
simulates phone-OTP and issues a token the API's fake verifier accepts — no GCP
needed. Log in with any phone number and any code.

## Quality gates

```bash
npm run i18n:check   # ja/en key parity (also a Vitest test)
npm run lint
npm run typecheck
npm test             # Vitest unit/component
npm run build
npm run e2e          # Playwright happy-path (needs a running API)
```

CI (`.github/workflows/ci.yml`) runs parity, lint, type-check, tests, and build.

## API types

The typed client (`src/lib/api/client.ts`) is built on types generated from the
backend OpenAPI schema. Refresh after API changes with `npm run gen:api` (reads
`openapi.snapshot.json`).

See `CLAUDE.md` for the layout and conventions.
