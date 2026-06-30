# STATUS — living progress tracker

> Update this file at the end of every work session. It is the first thing a new GenAI
> session reads after `CLAUDE.md`.

_Last updated: 2026-06-30_

## Current phase
**Phase 1 — deployed to dev.** The full cycle works end-to-end:
post job → apply → confirm → check-in → check-out → approve completion → reviews,
with admin vetting, the visa/insurance gates, server-side contact masking, and
the ¥3,000 fee record. Backend (`crafton-api`, build-order steps 1–7) and the
PWA (`crafton-web`, step 8) are built and green; happy-path E2E in place (step 9).
**Pushed to `main`** in both app repos and **deployed to the GCP dev project**
(`crafton-dev-500709`, region `asia-northeast1`) on Cloud Run.

- **Live dev web app:** https://crafton-web-dev-r7wu72i7ja-an.a.run.app

Auth note (ADR 0009): the OTP-only model was superseded — registration uses
Firebase phone OTP **only to confirm the phone number**, capturing a real
account (username + email + password); returning sign-in is identifier
(username/email/phone) + password with an API-issued session token.
Remaining before go-live: real Firebase project wiring for production, email
provider for verification/reset emails, and legal sign-off on the terms wording.

## Done
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

## In progress
- (Phase 1 dev build complete — see "Next up" for deployment + go-live items.)

## Next up (in order)
1. ✅ **Owner:** billing linked to `crafton-dev-500709` and the GCS state bucket created.
2. ✅ App repos `crafton-api` and `crafton-web` created by owner.
   ✅ Dev Project ID confirmed (`crafton-dev-500709`) and wired into Terraform.
3. ✅ Phase 1 app built end-to-end in both repos (steps 1–9 above), pushed to `main`.
4. ✅ **Deployed to dev:** `terraform apply`-ed the `dev` environment; API + web containers
   on Cloud Run; Cloud SQL + Storage bucket wired. Live web app:
   https://crafton-web-dev-r7wu72i7ja-an.a.run.app
5. **Go-live prep (remaining):** wire the **real Firebase** project for production phone OTP
   (dev still uses the fake verifier); add an **email provider** for verification + password-
   reset emails; **legal sign-off** on the terms wording; add app icons.

## Open questions / blockers
- [x] GCP **dev project** `crafton-dev-500709` (number 784671749504): billing linked,
  GCS state bucket created, `terraform apply`-ed, and the API + web are **live on Cloud
  Run** (`asia-northeast1`). `crafton-prod` project is created later.
- [ ] Exact "Greater Tokyo" prefecture list (default: Tokyo, Kanagawa, Saitama, Chiba).
- [ ] Initial trade list (default: open free-text + suggestions).
- [ ] Legal sign-off owner for contract/tax/insurance/visa wording (Phase 2 lead time).
- [ ] Confirm Firebase project setup approach (within same GCP project).
- [ ] eKYC vendor decision (TRUSTDOCK vs defer) — needed before Phase 2.

## Decisions log (pointers)
All locked decisions are in `docs/adr/`. Summary table in `CLAUDE.md`.
