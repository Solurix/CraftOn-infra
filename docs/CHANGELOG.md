# CHANGELOG — session history

Session history, newest first. Live state is in [STATUS.md](STATUS.md).

## Fix: dev revision won't start — preview leaked onto the live service 🚑 (2026-07-11)
`crafton-api-dev` stopped booting after recent deploys. Root cause: the per-PR
preview pipeline deployed a `--no-traffic --tag pr<N>` **revision of the shared
service** and set `CRAFTON_DB_NAME=crafton_pr<N>` via `--update-env-vars`. Tags
don't sandbox config — that call **mutated the shared service's base template**, so
`CRAFTON_DB_NAME=crafton_pr1` + the `preview-pr` label leaked onto `crafton-api-dev`.
The next ordinary revision inherited it; once PR #1 closed and `crafton_pr1` was
dropped, the live service's boot-time `alembic upgrade head` failed with
`FATAL: database "crafton_pr1" does not exist`, uvicorn never bound `$PORT`, and the
startup probe failed ("container failed to start and listen on the port").

Fix (branch `claude/revision-startup-issue-zv1suj`, all three repos):
- **Previews are now standalone per-PR services** `crafton-api-dev-pr<N>` /
  `crafton-web-dev-pr<N>` (not tagged revisions of the live service), so a preview
  can never touch prod. `preview-deploy.yml` sets the full runtime config explicitly
  and `--allow-unauthenticated`; `preview-cleanup.yml` deletes the whole service (+
  drops `crafton_pr<N>` for the API). No tag/revision dance, no "can't delete latest
  revision" caveat.
- **Web pairing** now resolves the paired API preview's own service URL
  (`crafton-api-dev-pr<M>`), falling back to the live API if unreachable.
- **Self-heal**: the main-branch `deploy` jobs scrub any historical leak —
  crafton-api removes `CRAFTON_DB_NAME` + `preview-pr` and re-asserts
  `STORAGE_MODE=gcs`; crafton-web removes `preview-pr`.
- Deployer `roles/run.admin` already covers per-PR service create/delete + public
  IAM, so no infra IAM change was needed. Docs: `docs/12-preview-environments.md`
  rewritten with a postmortem.
- **Owner action to unblock the live service now** (pipeline change only prevents
  recurrence): `gcloud run services update crafton-api-dev --region asia-northeast1
  --remove-env-vars CRAFTON_DB_NAME --update-env-vars CRAFTON_STORAGE_MODE=gcs
  --remove-labels preview-pr` (or `make tf-apply` on dev). The next merge to main
  also self-heals it.

## Feedback round 2 ✨ (2026-07-10, same branch)
Second batch of dev-deployment feedback, all three repos:
- **Registration validation** (`crafton-web`): per-field inline ja/en messages
  (username/email/phone/password rules) instead of the server's generic 422;
  phone entry is a **country-code picker** (+81 default, common worker
  nationalities) + national number; ApiClient sends `Accept-Language` so API
  errors localize to the UI language.
- **Account switcher bug fixed**: "add account" while logged in silently
  returned the current account (stale state token beat the fresh OTP token in
  `completeSignup`; `/auth/session` accepts session tokens and idempotently
  returned the existing user). localStorage now wins; e2e regression test
  added. "Set a password" card → "Change password".
- **Structured names** (`crafton-api` + web): family/given/middle columns;
  `full_name` composed family-first; registration asks 姓/名 (+任意 middle).
- **Admin-managed trade catalog**: `trades` table (ja canonical + en label,
  seeded with the 12 picker trades), `GET /trades` for pickers, admin CRUD +
  custom-value aggregation + **merge** (rewrites profiles/jobs, deduplicated).
  Admin UI has a Trades tab (add, toggle active, merge/promote user-invented
  values). Web pickers (worker form + post-job) use the catalog with localized
  labels; custom entries via chip TagInput.
- **Slim registration**: work history, qualifications, skills, tools, bio moved
  out of worker onboarding (added later in profile settings); skills/tools/
  qualifications now chip inputs (＋/Enter/、･, splits) instead of CSV text.
- **Night shifts**: end times up to 36:00 in the post-job picker
  (29:00（翌5:00）style); stored as end ≤ start = next day; all time ranges
  display in the 24+ convention. Post-job validates inline (end after start,
  ≤24h, past date, wage, headcount).
- **Job posting photos**: `jobs.photo_doc_ids` references the contractor's own
  `job_photo` documents so previously uploaded photos are **reused** (no
  duplicate GCS objects); `GET /jobs/{id}/photos` serves signed URLs to any
  approved viewer; photos render on the job detail page.
- **Photo-upload 500 fixed for Cloud Run**: `GcsStorage` falls back to IAM
  SignBlob signing when credentials have no private key (the dev deployment's
  "network" error on Add photo). Needs re-verification on the dev deploy.
- Gates: API 196 pytest / ruff / mypy; web i18n parity (447 keys) / lint /
  typecheck / 30 vitest / build / 3 Playwright e2e; feature flows verified in a
  real browser (slim registration, 21:00–29:00 posting with photo, admin
  trades tab at 390px).

## Mobile & registration UX pass ✨ (2026-07-10)
Feedback round on the dev deployment (mobile admin breakage + registration friction):
- **Admin on mobile fixed** (`crafton-web`): the tab strip scrolls inside its own
  container, action rows wrap, and the app header no longer overflows narrow
  viewports (`overflow-x: clip` safety net on `body`). Verified at 390px with a
  headless-browser check (no horizontal scroll).
- **Design pass**: professional brand blue (`#0a66c2` family), flat neutral canvas
  (gradient removed), solid white header with logo mark, JP-aware system font
  stack, icon-only language switcher on phones. Manifest/viewport theme colors
  updated.
- **Registration simplified**: signup no longer asks for a display name; the API
  defaults it on first onboarding (worker → full name, contractor → company
  name) and it stays editable in profile settings (`crafton-api`
  `services/onboarding.py`). Role choice is now two descriptive cards.
- **Prefecture is a picker** (47 canonical romaji values + ja labels,
  `crafton-web/src/lib/prefectures.ts`) in worker/contractor onboarding, profile
  settings, post-job, and the jobs filter; stored values stay compatible with
  `service_area_prefectures`. Display is localized everywhere it's shown.
- **Worker form (職歴)**: each work-history entry gained a free-text summary
  (概要, `WorkHistoryEntry.description`, JSON column — no migration) with example
  placeholder text; comma-separated fields got example placeholders and also
  split on `、`/`・`; the standalone years-of-experience input was removed
  (derived from work-history years). _Phase 2+ idea: AI-assisted drafting of the
  summary (docs/04 §3.1)._
- Web OpenAPI snapshot + generated types refreshed; e2e specs updated; all gates
  green in both repos (188 pytest / 30 vitest / 2 Playwright).
- **iOS/PWA responsiveness hardening**: viewport `maximum-scale=1` +
  `viewport-fit=cover`, 16px form controls under the `sm` breakpoint (both halves
  of the iOS input-focus zoom fix), `touch-action: manipulation`, safe-area
  insets (body sides, bottom nav home-indicator, content clearance), and an
  initial-only account avatar on phones so the header fits 320px. Headless audit
  at 320px/390px across landing, login/signup, worker onboarding and all admin
  tabs: no horizontal overflow.

## Dev environment — DEPLOYED to GCP ✅ (2026-06-29)
The `dev` Terraform environment is live in `crafton-dev-500709` (Tokyo), with the
real app images running on Cloud Run and Cloud SQL connectivity verified:
- **Web (PWA):** https://crafton-web-dev-r7wu72i7ja-an.a.run.app — `HTTP 200`.
- **API:** https://crafton-api-dev-r7wu72i7ja-an.a.run.app — `/readyz` →
  `{"status":"ready","checks":{"database":"ok"}}`; auth-gated routes return 401 as expected.
- **Cloud SQL** `crafton-dev` (PostgreSQL 16, `db-f1-micro`, ENTERPRISE edition) RUNNABLE;
  the API reaches it via the Cloud SQL connector + `CRAFTON_DATABASE_URL` from Secret Manager.
  Alembic migrations run at container boot.
- **Images** in Artifact Registry `asia-northeast1-docker.pkg.dev/crafton-dev-500709/crafton`
  (`api:dev`, `web:dev`). Remote TF state in `gs://crafton-dev-500709-tfstate`.
- **Auth is still `fake`** (`CRAFTON_AUTH_MODE`/`NEXT_PUBLIC_AUTH_MODE`) — real Firebase wiring is the next go-live step.
- Managed from the **workspace-root `Makefile`** (dockerized Terraform — no local install):
  `make tf-apply`, `make api-image`/`web-image`, `make gcp-start`/`gcp-stop`/`gcp-status`/`gcp-urls`.
- Known follow-up: the API's `/healthz` returns a GFE-level 404 (the app registers it; `/readyz`
  is the working health path and what Cloud Run probes).

### CI/CD — auto-deploy on push to `main` ✅
Each app repo's `.github/workflows/ci.yml` has a gated `deploy` job (`needs: lint-type-test`,
only on push to `main`) that builds + pushes the image and rolls the Cloud Run service via
`gcloud run services update`. Auth is **Workload Identity Federation** (no stored keys):
- Pool/provider `github-actions/github`, deployer SA `crafton-deployer@…`, trusting
  `Solurix/CraftOn-api` and `Solurix/CraftOn-web` (Terraform: `environments/dev/cicd.tf`).
- **API:** migrations run via the container entrypoint (`alembic upgrade head`) on the new
  revision; Cloud Run gates traffic on readiness, so a failed migration fails the deploy and
  keeps the old revision serving.
- **Web:** the job resolves the live API URL and bakes `NEXT_PUBLIC_API_BASE_URL` at build time.
- **Terraform apply stays manual** (`make tf-apply`); the pipeline never runs Terraform.
- Images are pushed as both `:dev` (deployed; matches `tfvars`, so no TF drift) and `:<sha>` (rollback).

### Per-PR preview environments 🧪 (added 2026-07-01) — see `docs/12-preview-environments.md`
Every PR on `crafton-api` / `crafton-web` gets a **no-traffic, `--tag pr<N>` Cloud Run
revision** at a deterministic `https://pr<N>---…` URL, torn down on PR close. Built on
the runner (like the existing deploy jobs), triggered by `pull_request_target` from
`main`, same-repo non-draft PRs only.
- **API:** isolated `crafton_pr<N>` database on the `crafton-dev` instance; the app
  swaps only the db-name segment via non-secret `CRAFTON_DB_NAME` (still mounts the
  shared `crafton-db-url` secret). Migrates at boot, serialized by a
  `pg_advisory_xact_lock` inside Alembic's transaction; smoke test = signup→login→`/me`.
- **Web:** image baked against the live `crafton-api-dev` URL; no DB. **Opt-in API
  pairing:** a web PR that declares `api-pr: <M>` (or an `api-pr-<M>` label) bakes the
  paired API preview `https://pr<M>---<api-host>` instead — so a coordinated api+web
  change previews end-to-end — with a live-API fallback if that preview isn't reachable
  (`edited` trigger repoints on a body edit; no API change needed, CORS is already `*`).
- **IAM:** new least-privilege custom role `craftonPreviewDbManager` (create/drop
  Cloud SQL databases) bound to `crafton-deployer@…` in `environments/dev/cicd.tf`.
- **Governance:** `.github/CODEOWNERS` in both app repos; `ci.yml` gained an
  "exactly one migration head" guard.
- **Validated end-to-end (2026-07-02):** PR #1 on crafton-api created `crafton_pr1`,
  deployed a tagged revision that migrated at boot, and passed the signup→login→`/me`
  smoke test — confirming `crafton_app` can create tables in a fresh DB with **no**
  `template1` grant (Cloud SQL makes it a `cloudsqlsuperuser`).
- **Owner one-time setup before first use:** `make tf-apply` (creates the
  `craftonPreviewDbManager` role — the only hard prerequisite) and enable branch
  protection (require PR + Code Owners + status checks). No schema grant needed.

## Phase 1 wrap-up additions (on `main`)
**This session's additions (on `main`):** forgot/reset password (via OTP) +
account-identifier updates (`PATCH /me/account`); a document **view-url** signed-read
endpoint + web **photo management** (upload + gallery); fuller contract-terms
wording; and web **Terms of Service / Privacy** pages. All gates green in both app
repos; deploys via the CI/CD pipeline on push to `main` (no `terraform apply` needed).

## Done
- ✅ **Auth reworked (2026-06-29, ADR 0009):** returning login by identifier
  (username / email / phone) + password → **API-issued HS256 session token**; Firebase
  phone OTP now **only at registration**. `users` gained unique `username`/`email`
  (Alembic `a1b2c3d4e5f6`); a bootstrap `admin`/`admin` is seeded by migration
  (`b2c3d4e5f6a7`) — rotate before prod. API + web updated; all gates green. New env:
  `CRAFTON_SESSION_SECRET`/`CRAFTON_SESSION_TTL_SECONDS` (`docs/07`).
- ✅ Product overview, architecture, roadmap agreed (`docs/01`–`03`).
- ✅ Detailed Phase 1 spec (`docs/04`).
- ✅ Data model, API contract, config/flags (`docs/05`–`07`).
- ✅ Compliance/legal notes, testing strategy, repo strategy, glossary (`docs/08`–`10`, glossary).
- ✅ i18n policy: Japanese default + full English, English dev language (`docs/11`, ADR 0008).
- ✅ ADRs for the locked decisions (`docs/adr/`).
- ✅ Terraform skeleton (`infra/terraform/`) — not yet `apply`-ed (needs GCP project + billing).
- ✅ **`crafton-api` skeleton (build-order step 1)** on branch
  `claude/crafton-phase-1-dev-9d5sof`:
  - FastAPI app factory, structured logging, uniform `{error:{code,message}}` envelope.
  - **Config/flags layer** with precedence `app_config row > CRAFTON_CFG__<KEY> env >
    default`, registry mirroring `docs/07` (nothing hardcoded; compliance gates default ON).
  - **All Phase 1 DB models** (`docs/05`) + **initial Alembic migration**; `alembic check`
    reports no drift, upgrade→downgrade→re-upgrade verified clean.
  - **Firebase auth** behind a verifier abstraction (real + fake for dev/CI/tests; no GCP
    needed), `POST /auth/session` + `GET /me`, role guards.
  - **i18n catalog** on the API (`ja`/`en`) + parity check wired into CI.
  - `/healthz` + `/readyz`; CI (ruff, mypy, i18n parity, migration round-trip, pytest).
- ✅ **`crafton-api` Phase 1 backend (steps 2–7)** on `main`:
  - **Onboarding + documents + admin vetting** (step 2): worker/contractor onboarding,
    signed-URL document upload (storage abstraction: fake for dev/CI, GCS for prod),
    vetting queue + approve/reject/suspend with the **visa gate** (non-JP needs card +
    non-expired visa).
  - **Jobs** (step 3): post/list/detail/search/cancel with config-driven service-area &
    allowed-trades checks (permissive by default).
  - **Matching** (step 4): apply/confirm, **state machine** (legal transitions only),
    contract-type routing (employee→day-labor, freelance→subcontract), **freelance-insurance
    gate**, wage snapshot, generated placeholder terms.
  - **Chat + contact masking** (step 5): server-authoritative masking of phones/11-digit/
    email/LINE incl. full-width & kana edge cases.
  - **Check-in/out + completion + fee** (step 6): lifecycle endpoints; ¥3,000 fee recorded
    unpaid; admin matchings list + mark-fee-paid + config read/update. New
    `matchings.completion_requested_at` column (+ migration; docs/05 updated).
  - **Reviews + trust** (step 7): two-way reviews after completion; derived trust_score/rating.
  - **109 tests** (incl. all must-test rules + a full-cycle integration test); ruff + mypy clean.
- ✅ **`crafton-web` PWA (step 8)** on `main`: Next.js App Router PWA, next-intl (ja+en,
  parity in CI), Firebase-OTP auth abstraction (fake mode for dev/CI/E2E), typed client from
  the API OpenAPI, full worker/contractor/admin screens for the cycle, installability,
  empty/error states. Vitest + lint + typecheck + build green.
- ✅ **Hardening + E2E (step 9)**: API-level full-cycle test + Playwright browser smoke
  (signup→onboarding) verified against a running API.

## Completed milestones (moved from STATUS "Next up")
1. ✅ **Billing** linked to `crafton-dev-500709`; versioned **GCS state bucket**
   `crafton-dev-500709-tfstate` created (`make bootstrap-state`); `dev/backend.tf` wired.
2. ✅ App repos `crafton-api` and `crafton-web` created by owner.
   ✅ Dev Project ID confirmed (`crafton-dev-500709`) and wired into Terraform.
3. ✅ Phase 1 app built end-to-end in both repos (steps 1–9 above), pushed to `main`.
4. ✅ **Deployed:** `terraform apply` of `dev` done; API + web containers built/pushed and
   running on Cloud Run; Cloud SQL + Storage bucket + Secret Manager wired (Firebase still `fake`).
