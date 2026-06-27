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

- **This repo (`crafton`)** = infrastructure (Terraform), docs, governance.
  No application code.
- **`crafton-api`** (future repo) = FastAPI backend.
- **`crafton-web`** (future repo) = Next.js PWA frontend.
- See `docs/10-repo-strategy.md` for the full plan, naming, and what goes where.

## Locked technical decisions (do not silently change)

| Area | Decision | ADR |
|---|---|---|
| Cloud | Google Cloud Platform, region `asia-northeast1` (Tokyo) | `docs/adr/0001-cloud-gcp.md` |
| Backend | Python + FastAPI, SQLAlchemy + Alembic, Pydantic | `docs/adr/0002-backend-python-fastapi.md` |
| Frontend | Next.js (React + TypeScript) as a mobile-first **PWA** | `docs/adr/0004-web-pwa-first.md` |
| Repos | Multi-repo (not monorepo) | `docs/adr/0003-multi-repo.md` |
| AI | Vertex AI, **Gemini** models (cheaper than Claude) | `docs/adr/0005-vertex-ai-gemini.md` |
| IaC | Terraform, GCS remote state | `docs/adr/0006-terraform-iac.md` |
| Auth | Firebase Auth (phone OTP) | `docs/adr/0007-auth-firebase-phone.md` |
| DB | PostgreSQL (Cloud SQL) | `docs/adr/0002-backend-python-fastapi.md` |
| i18n | App default Japanese; full English; dev language English | `docs/adr/0008-i18n-ja-default-en-full.md` |

To change any of these: write/update an ADR explaining the change, then update every
doc that referenced the old decision.

## How to continue work (session checklist)

1. Read this file, `docs/03-roadmap.md`, and the spec for the current phase
   (`docs/04-phase-1-spec.md` for now).
2. Check `docs/STATUS.md` for what's done / in progress / next.
3. Do the work in the correct repo (see above).
4. Write/extend tests.
5. Update `docs/STATUS.md` and any affected docs.
6. Commit with a clear message describing *what changed and why*.

## Conventions

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
