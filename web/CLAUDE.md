# CLAUDE.md — `crafton-web`

Web/PWA frontend (`web/`) of the CRAFT-ON monorepo. **Source of truth for product,
data model, API contract, config, compliance, and i18n is the repo-root `docs/`.**
Read those first; this file pins the web-local essentials.

## Read first (repo root)
- `../CLAUDE.md`, `../docs/04-phase-1-spec.md` (screens in §4),
  `../docs/06-api-contract.md`, `../docs/11-i18n.md`.

## Locked decisions (see `crafton/docs/adr/`)
| Area | Decision |
|---|---|
| Framework | **Next.js App Router** + TypeScript, mobile-first **PWA** |
| i18n | **next-intl**; message **keys English**, default locale **`ja`**, full **`en`** (parity in CI) |
| Auth | Identifier (username/email/phone)+password login → **API session token**; Firebase phone OTP **only at registration** (ADR 0009). Dev/CI/E2E use a **fake** OTP token matching the API's fake verifier |
| API types | generated from the backend **OpenAPI** (`npm run gen:api`) — no hand-maintained duplicates |
| Money/time | integer **JPY**; times display **Asia/Tokyo** |
| Tests | Vitest + Testing Library; Playwright E2E |

## Layout
```
src/
  app/                 App Router pages (login, onboarding, jobs, applications,
                       matchings, post-job, my-jobs, admin)
  components/          AppShell, RequireAuth, LanguageSwitcher, ui, SW registrar
  lib/
    api/               client.ts (typed), models.ts (from schema.ts), schema.ts (generated)
    auth/              context.tsx (AuthProvider/useAuth), fakeToken.ts
    format.ts, useAsync.ts
  i18n/request.ts      next-intl config (locale from NEXT_LOCALE cookie, default ja)
messages/{ja,en}.json  UI catalogs (keep keys in parity)
public/                manifest.webmanifest, sw.js, icons
tests/                 Vitest; tests/e2e Playwright
```
Per-file index: **`docs/MAP.md`** (what lives where, what's generated/large,
where to change what) — read it before searching the tree.

## Conventions
- **No hardcoded user-facing strings** — everything via next-intl keys; add to
  **both** `messages/ja.json` and `messages/en.json` in the same change (CI
  enforces parity, also covered by a Vitest test).
- **Don't hand-edit `src/lib/api/schema.ts`** — regenerate via `npm run gen:api`.
- Talk to the API only through `ApiClient`; surface `{error:{code,message}}` as
  `ApiError`.
- The contact-masking warning shown in chat is informational; masking is
  **authoritative on the server** (docs/08) — never rely on client masking.
- Keep it mobile-first and installable (manifest + service worker).

## Quality gates (run before committing)
From the repo root: `make check-web` (runs i18n:check → lint → typecheck → test →
build in Docker). Or in `web/` directly:
`npm run i18n:check && npm run lint && npm run typecheck && npm test && npm run build`
Then update `../docs/STATUS.md`.
