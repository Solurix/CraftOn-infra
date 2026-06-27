# STATUS — living progress tracker

> Update this file at the end of every work session. It is the first thing a new GenAI
> session reads after `CLAUDE.md`.

_Last updated: 2026-06-27_

## Current phase
**Phase 1 — building.** `crafton-api` skeleton (build-order step 1) is in place and
green. Next: auth/users/onboarding + document upload + admin vetting (step 2).

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
  - 20 tests passing (config precedence, i18n parity, health, auth/session); ruff + mypy clean.

## In progress
- `crafton-api` build-order **step 2**: auth/users/onboarding, document upload (signed
  URLs), and admin vetting.

## Next up (in order)
1. **Owner:** link **billing** to `crafton-dev-500709` and create the versioned **GCS
   state bucket** `crafton-dev-500709-tfstate` (then uncomment `dev/backend.tf`).
2. ✅ App repos `crafton-api` and `crafton-web` created by owner.
   ✅ Dev Project ID confirmed (`crafton-dev-500709`) and wired into Terraform.
3. ✅ Phase 1 session started; `crafton-api` scaffolded (step 1, above).
4. Continue Phase 1 features in `docs/04-phase-1-spec.md` §7 order: onboarding + documents
   + admin vetting → jobs → matching → chat/contact-masking → check-in/out + fee → reviews,
   then `crafton-web` PWA.
5. `terraform apply` the `dev` environment (once #1 done) to deploy.

## Open questions / blockers
- [~] GCP **dev project** confirmed: **Project ID `crafton-dev-500709`** (number
  784671749504), wired into `infra/terraform/environments/dev/`. Remaining before
  `terraform apply`: link a **billing account** and create a versioned **GCS state
  bucket** (`crafton-dev-500709-tfstate`), then uncomment `backend.tf`.
  `crafton-prod` project is created later.
- [ ] Exact "Greater Tokyo" prefecture list (default: Tokyo, Kanagawa, Saitama, Chiba).
- [ ] Initial trade list (default: open free-text + suggestions).
- [ ] Legal sign-off owner for contract/tax/insurance/visa wording (Phase 2 lead time).
- [ ] Confirm Firebase project setup approach (within same GCP project).
- [ ] eKYC vendor decision (TRUSTDOCK vs defer) — needed before Phase 2.

## Decisions log (pointers)
All locked decisions are in `docs/adr/`. Summary table in `CLAUDE.md`.
