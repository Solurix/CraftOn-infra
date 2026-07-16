# CLAUDE.md — Guide for GenAI-driven development

This project is built **GenAI-first**. Most code and docs are produced by AI coding
sessions. This file is the entry point for any such session. **Read it fully before
doing anything.**

## Golden rules

1. **Docs are the source of truth.** If you make or change a decision, update the
   relevant file in `docs/` **in the same commit**. Code and docs must never drift.
2. **Never lose context.** Anything a future session needs to continue must be
   written down here or in `docs/`, not left implicit in a chat.
3. **Phase discipline.** We ship a *working* app first, then add logic gradually.
   Do not pull Phase 2/3 features into Phase 1. See `docs/03-roadmap.md`.
4. **Everything configurable.** Business limits (area, fees, caps, timings,
   penalties) are config vars / feature flags with safe defaults — never hardcoded.
   See `docs/07-config-and-flags.md`.
5. **Tests are not optional.** Every feature ships with tests. See
   `docs/09-testing-strategy.md`. Target: meaningful coverage of business logic,
   not vanity numbers.
6. **One hard compliance gate even in MVP:** foreign-worker visa validity /
   work-permission. Everything else starts permissive. See `docs/08-compliance-legal.md`.

## What lives where

This is a **single monorepo** (ADR 0010). Directories:

- **`api/`** = FastAPI backend (SQLAlchemy + Alembic, pytest). Owns the DB migrations.
- **`web/`** = Next.js PWA frontend (workers + contractors + gated `/admin`). Its typed
  API client is generated from the backend OpenAPI (`npm run gen:api`).
- **`infra/terraform/`** = GCP IaC (`environments/{dev,prod}` + `modules/`).
- **`docs/`** = product / architecture / governance — the source of truth.
- **`scripts/`**, **`Makefile`**, **`docker-compose.yml`** = the containerized dev/CI harness.
- There is **no mobile app** — the installable PWA is the Android/iOS story.

See `docs/10-repo-strategy.md` for the full layout and what-goes-where.

## Locked technical decisions (do not silently change)

| Area | Decision | ADR |
|---|---|---|
| Cloud | Google Cloud Platform, region `asia-northeast1` (Tokyo) | `docs/adr/0001-cloud-gcp.md` |
| Backend | Python + FastAPI, SQLAlchemy + Alembic, Pydantic | `docs/adr/0002-backend-python-fastapi.md` |
| Frontend | Next.js (React + TypeScript) as a mobile-first **PWA** | `docs/adr/0004-web-pwa-first.md` |
| Repos | **Single monorepo** (api + web + infra + docs); no mobile app | `docs/adr/0010-monorepo.md` |
| AI | Vertex AI, **Gemini** models (cheaper than Claude) | `docs/adr/0005-vertex-ai-gemini.md` |
| IaC | Terraform, GCS remote state | `docs/adr/0006-terraform-iac.md` |
| Auth | Identifier (username/email/phone) + password login; **API session tokens**; Firebase phone OTP **at registration only** | `docs/adr/0007-auth-firebase-phone.md`, `docs/adr/0009-password-login-session-tokens.md` |
| DB | PostgreSQL (Cloud SQL) | `docs/adr/0002-backend-python-fastapi.md` |
| i18n | App default Japanese; full English; dev language English | `docs/adr/0008-i18n-ja-default-en-full.md` |

To change any of these: write/update an ADR explaining the change, then update every
doc that referenced the old decision.

## How to continue work (session checklist)

1. Read this file, `docs/03-roadmap.md`, and the spec for the current phase
   (`docs/04-phase-1-spec.md` for now).
2. Check `docs/STATUS.md` for what's done / in progress / next.
3. Do the work in the correct directory (`api/`, `web/`, `infra/`, `docs/`).
4. Write/extend tests.
5. Update `docs/STATUS.md` and any affected docs: refresh "Current state" / "Next up",
   append your session entry to "Recent sessions", and push older entries down into
   `docs/CHANGELOG.md` so STATUS stays short.
6. Commit with a clear message describing *what changed and why*.

## Dev workflow (everything runs in Docker — no local venv/node_modules)

```bash
cp .env.example .env          # local defaults are fine (fake auth, fake storage)
make up                       # build + run db + api + web (docker compose)
make help                     # list all targets
```

The stack comes up on offset ports: **web** http://localhost:53000, **api**
http://localhost:58000 (`/docs`, `/readyz`), **db** localhost:55432. Useful targets:
`make migrate`, `make makemigration m="msg"`, `make fmt`, `make logs`, `make db-shell`.

### Infra / Terraform (containerized — no local install)

There is **no local `terraform` binary**; it runs in the `hashicorp/terraform` image via
Make targets. Do **not** `apt install terraform`.

```bash
make tf-fmt        # fmt -recursive over infra/terraform
make tf-validate   # init -backend=false + validate (no GCP creds needed)
make tf cmd="plan" # any terraform cmd against environments/dev (mounts ~/.config/gcloud)
make tf-apply      # plan/apply need `gcloud auth application-default login` first
```

After editing any `.tf`, run `make tf-fmt && make tf-validate`.

## Verifying changes (do this — don't eyeball)

```bash
make check        # full gate: api (ruff+mypy+i18n+migrations+pytest) and web (i18n+eslint+tsc+vitest+build)
make check-api    # backend only
make check-web    # frontend only
make smoke        # boot db+api and confirm GET /readyz
```

`make check` runs `scripts/check.sh`, which CI runs too — green locally == green in CI.

## Shipping a change (every session, after coding — not optional)

Details in `docs/12-preview-environments.md`.

1. **Push + PR** — push the `claude/<slug>` branch and open a PR onto `main`. The PR
   triggers CI and deploys the previews.
2. **Get CI green** — the single required check is **`ci`** (path-filtered `api`/`web`/
   `smoke` jobs roll up into it). Fix and re-push until green.
3. **Wait for the previews** — the bot comments both preview URLs: a standalone
   `crafton-api-dev-pr<N>` on an isolated `crafton_pr<N>` DB, and a `crafton-web-dev-pr<N>`
   baked against **this PR's** api preview (auto-paired). The deploy lags CI by a few
   minutes.
4. **Log in and test the change ON the preview** — not just unit tests. Dev uses fake
   auth, so `scripts/api.sh` (with `CRAFTON_API=<preview-api-url>`) or the web UI can
   sign up a throwaway user and drive the changed flow end-to-end.
5. **Report to the owner** — short status on the PR *and* in chat: what changed, CI
   green, what was tested on the preview, the preview URLs, and whether CODEOWNERS-
   protected paths are touched (`.github/`, `infra/`, `api/migrations`, `api/app/core/
   config.py`|`auth.py`, `api/app/db/`, deps, Dockerfiles). **The owner reviews the
   preview and merges — never merge yourself.**

## Conventions

- **Backend (`api/`):** Python 3.11, ruff (line length 100, `migrations/` excluded),
  mypy on `app`. Read every business knob through `ConfigService` (never hardcode a
  `docs/07` value). Every schema change is an Alembic migration with a working
  `downgrade`; keep a single migration head. Local dev & tests use fake auth
  (`CRAFTON_AUTH_MODE=fake`) and a local/CI Postgres.
- **Frontend (`web/`):** strict `tsc`, eslint (Next core-web-vitals). No hardcoded
  user-facing strings — everything via next-intl keys, added to **both**
  `web/messages/ja.json` and `web/messages/en.json` in the same change (CI enforces
  parity). Talk to the API only through `ApiClient`; don't hand-edit
  `web/src/lib/api/schema.ts` (regenerate via `npm run gen:api`).
- **API contract:** the FastAPI schemas in `api/app/schemas/` are the source of truth;
  the web typed client is generated from the backend OpenAPI. Contact masking is
  authoritative on the server (`docs/08`) — never rely on client masking.
- **Language of code & docs:** English (identifiers, comments, docs, commit messages,
  and i18n message keys). **App default UI language is Japanese (`ja`)** with a
  **complete English (`en`) translation** (100% key parity, enforced in CI). Keys are
  English; default rendered locale is Japanese. See `docs/11-i18n.md` and
  `docs/glossary.md` (Japanese domain terms).
- **Money:** integers in **JPY** (no decimals). Never use floats for money.
- **Time:** store UTC; display Asia/Tokyo. Business rules (e.g. "20:00 night-before
  confirm") are in Asia/Tokyo.
- **IDs:** UUID v4 primary keys.
- **Secrets:** never commit. Use GCP Secret Manager; local dev uses `.env` (gitignored).
- **Migrations:** every schema change is an Alembic migration; never edit the DB by hand.

## Guardrails / things that will bite you

- This is a regulated domain (labor law, immigration, tax, personal data under
  Japan's APPI). When touching契約/税務/在留 logic, re-read `docs/08-compliance-legal.md`
  and prefer **flagging open legal questions** over inventing rules.
- Do not store My Number. Do not retain residence-card images longer than needed.
- Anti-disintermediation (中抜き) and anti-no-show (ドタキャン) are core business
  value — don't weaken them when refactoring.
