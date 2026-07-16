# STATUS — living progress tracker

> Update this file at the end of every work session. It is the first thing a new GenAI
> session reads after `CLAUDE.md`. Keep it short: append your session to
> "Recent sessions" and push older entries down into [`CHANGELOG.md`](CHANGELOG.md).

_Last updated: 2026-07-16_ · History: [`docs/CHANGELOG.md`](CHANGELOG.md)

## Current state

**Phase 1 — feature-complete and deployed to dev.** The full cycle works end-to-end
(post job → apply → confirm → check-in → check-out → approve completion → reviews),
with admin vetting, the visa/insurance gates, server-side contact masking, and the
¥3,000 fee record. Code now lives in a **single monorepo** (`api/`, `web/`, `infra/`,
`docs/` — ADR 0010); both services are green and **deployed to the GCP dev project**
`crafton-dev-500709` (`asia-northeast1`) on Cloud Run, with Cloud SQL, Storage, and
Secret Manager wired; CI/CD auto-deploys the changed service on push to `main`, and
every PR gets both previews (`docs/12-preview-environments.md`). **Auth is still `fake`**
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

### 2026-07-16 — Consolidated into a single monorepo 📦
Merged `crafton-api` + `crafton-web` into this repo as `api/` and `web/` (clean copy),
dropped `crafton-mobile` (the PWA covers Android/iOS), and reshaped the repo to mirror
the sibling MuchoKarte project: root `Makefile`, `docker-compose.yml` (db+api+web on
offset ports 55432/58000/53000), `.env.example`, `scripts/check.sh`. CI is now one
path-filtered `ci.yml` (api/web/smoke jobs → single required `ci` check) with path-gated
deploy-api/deploy-web on push to main; one merged `preview-deploy.yml` deploys both
`crafton-{api,web}-dev-pr<N>` per PR and auto-pairs web → this PR's api preview (no more
`api-pr:` opt-in); merged `preview-cleanup.yml` + path-scoped CODEOWNERS. ADR 0010
supersedes 0003; repo-strategy, both app `CLAUDE.md`s, and the preview doc updated to
intra-repo paths. Terraform WIF `github_deploy_repos` collapsed to `Solurix/CraftOn-infra`.
**Owner action:** `make tf-apply` to apply that WIF change so Actions from the monorepo
can deploy/preview (until applied, they fail auth). Kept the existing
`environments/{dev,prod}`+`modules` Terraform (dev is live) — not flattened.

### 2026-07-12 — Job editing, check-in window, approval fixes, dark mode 🌙
`crafton-api`: PATCH /jobs/{id} now enforces `job_edit_cutoff_hours` (12h default),
a terms lock once workers are confirmed (headcount floor incl.), and notifies
pending applicants on term changes. Check-in is time-gated
(`checkin_open_minutes_before_start`, 120 default) — previously a worker could
check in and complete a job days before the work date, recording the fee.
Vetting fixes: unsuspend no longer force-approves unvetted users (visa-gate
bypass), rejected residence cards no longer satisfy the gate, job photos are
excluded from blanket doc review, auto-approve retries on profile PATCH.
`crafton-web`: contractors edit open jobs from my-jobs (diff-only PATCH); dark
mode hover/focus/active states overhauled; `/me` refreshes on focus + polls
while pending (approval reaches the app without reload); non-JP workers can
re-upload residence cards from profile; admin Users tab shows per-doc review
status. Verified on the deployed PR previews with real accounts (full cycle,
masking, gates, GCS signed upload/read on live dev). Gates: 241 pytest / 42
vitest, all green.

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
