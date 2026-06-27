# STATUS — living progress tracker

> Update this file at the end of every work session. It is the first thing a new GenAI
> session reads after `CLAUDE.md`.

_Last updated: 2026-06-27_

## Current phase
**Phase 0 → 1.** Foundation docs + infra skeleton in place. App not built yet.

## Done
- ✅ Product overview, architecture, roadmap agreed (`docs/01`–`03`).
- ✅ Detailed Phase 1 spec (`docs/04`).
- ✅ Data model, API contract, config/flags (`docs/05`–`07`).
- ✅ Compliance/legal notes, testing strategy, repo strategy, glossary (`docs/08`–`10`, glossary).
- ✅ i18n policy: Japanese default + full English, English dev language (`docs/11`, ADR 0008).
- ✅ ADRs for the locked decisions (`docs/adr/`).
- ✅ Terraform skeleton (`infra/terraform/`) — not yet `apply`-ed (needs GCP project + billing).

## In progress
- (nothing actively coding yet)

## Next up (in order)
1. **Owner:** provide / confirm GCP project + billing account + project ID, and the exact
   "Greater Tokyo" prefecture set. (See open questions.)
2. Create repos `crafton-api` and `crafton-web` (owner creates; AI scaffolds).
3. `terraform apply` the `dev` environment.
4. Scaffold FastAPI API (models + first migration + auth middleware + healthz).
5. Build Phase 1 features in the order in `docs/04-phase-1-spec.md` §7.

## Open questions / blockers
- [~] GCP **dev project created** (`crafton-dev`). Remaining before `terraform apply`:
  confirm the exact immutable **Project ID** (watch the `crafton` spelling), link a
  **billing account**, and create a versioned **GCS state bucket** (e.g. `crafton-tfstate-dev`).
  `crafton-prod` project is created later.
- [ ] Exact "Greater Tokyo" prefecture list (default: Tokyo, Kanagawa, Saitama, Chiba).
- [ ] Initial trade list (default: open free-text + suggestions).
- [ ] Legal sign-off owner for contract/tax/insurance/visa wording (Phase 2 lead time).
- [ ] Confirm Firebase project setup approach (within same GCP project).
- [ ] eKYC vendor decision (TRUSTDOCK vs defer) — needed before Phase 2.

## Decisions log (pointers)
All locked decisions are in `docs/adr/`. Summary table in `CLAUDE.md`.
