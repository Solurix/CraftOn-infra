# STATUS — living progress tracker

> Update this file at the end of every work session. It is the first thing a new GenAI
> session reads after `CLAUDE.md`. Keep it short: append your session to
> "Recent sessions" and push older entries down into [`CHANGELOG.md`](CHANGELOG.md).

_Last updated: 2026-07-11_ · History: [`docs/CHANGELOG.md`](CHANGELOG.md)

## Current state

**Phase 1 — feature-complete and deployed to dev.** The full cycle works end-to-end
(post job → apply → confirm → check-in → check-out → approve completion → reviews),
with admin vetting, the visa/insurance gates, server-side contact masking, and the
¥3,000 fee record. Both app repos are green and **deployed to the GCP dev project**
`crafton-dev-500709` (`asia-northeast1`) on Cloud Run, with Cloud SQL, Storage, and
Secret Manager wired; CI/CD auto-deploys on push to `main`, and every PR gets a
preview environment (`docs/12-preview-environments.md`). **Auth is still `fake`**
(`CRAFTON_AUTH_MODE` / `NEXT_PUBLIC_AUTH_MODE`) — real Firebase wiring is the next
go-live step. Known issue: the API's `/healthz` returns a GFE-level 404 (`/readyz`
is the working health path and what Cloud Run probes).

- **Web (PWA):** https://crafton-web-dev-r7wu72i7ja-an.a.run.app
- **API:** https://crafton-api-dev-r7wu72i7ja-an.a.run.app

## Next up (in order)

1. **Go-live prep:** swap `CRAFTON_AUTH_MODE`/`NEXT_PUBLIC_AUTH_MODE` to `firebase` and wire
   the Firebase web SDK; an **email provider** for verification/reset emails; legal sign-off
   on the auto-generated terms wording; add app icons.
2. **Hardening:** lock down API ingress/auth (currently public + `allow_public`), move Cloud SQL
   to private IP, switch storage to `gcs`, and resolve the `/healthz` GFE-404.

## Open questions / blockers

- [x] GCP **dev project** `crafton-dev-500709` (number 784671749504) fully bootstrapped:
  billing linked, state bucket created, `backend.tf` wired, and the env **applied**.
  `crafton-prod` project is created later.
- [ ] Exact "Greater Tokyo" prefecture list (default: Tokyo, Kanagawa, Saitama, Chiba).
- [ ] Initial trade list (default: open free-text + suggestions).
- [ ] Legal sign-off owner for contract/tax/insurance/visa wording (Phase 2 lead time).
- [ ] Confirm Firebase project setup approach (within same GCP project).
- [ ] eKYC vendor decision (TRUSTDOCK vs defer) — needed before Phase 2.

## Decisions log (pointers)

All locked decisions are in `docs/adr/`. Summary table in `CLAUDE.md`.

## Recent sessions

### 2026-07-11 — Repo cleanup & AI-session ergonomics pass 🧹
All three repos: index docs added for cheaper future sessions (`docs/README.md` +
slimmed `STATUS.md` with history in `CHANGELOG.md` here; `docs/MAP.md` in both app
repos), stale "future repo / not yet built" claims fixed, prod Terraform got a
drift warning (unapplied skeleton diverged from dev — see `environments/prod/main.tf`).
`crafton-web`: 744-line admin page split into per-tab files, worker-form model /
post-job helpers / API transport extracted, and all error toasts now localize
network failures (`humanizeError`) instead of leaking a raw "network" string.
`crafton-api`: matching-enrichment dedup, shared router response constants, DTO
builders moved to the service layer, two small auth fixes (locale whitelist from
`i18n.SUPPORTED_LOCALES`; response locale after a language switch), test-suite
helper consolidation. All gates green in both app repos.

### 2026-07-11 — Fix: preview leaked onto the live dev service 🚑
`crafton-api-dev` stopped booting: the per-PR preview pipeline's `--update-env-vars`
mutated the shared service's base template (`CRAFTON_DB_NAME=crafton_pr1` leaked; once
that DB was dropped, boot-time migrations failed). Previews are now **standalone per-PR
services** (`crafton-*-dev-pr<N>`) that can never touch the live service; main-branch
deploys self-heal any historical leak. Owner action to unblock now: remove
`CRAFTON_DB_NAME` from `crafton-api-dev` (or `make tf-apply`). Full postmortem:
[`CHANGELOG.md`](CHANGELOG.md) and `docs/12-preview-environments.md`.
