# 09 — Testing Strategy

Tests are **not optional** (project rule). Every feature ships with tests. We aim for
meaningful coverage of business logic and the compliance-critical paths — not vanity
percentages.

## What must always be tested

The business rules that protect the model — test these hardest:
- **Contact masking** filter (server-side): phone numbers, 11-digit sequences, "LINE",
  emails are blocked/flagged. Edge cases: spaced digits, full-width digits, kana for
  "ライン".
- **Visa gate:** non-JP worker without residence card / with expired visa cannot be
  approved or confirmed.
- **Freelance insurance gate:** uninsured 一人親方 cannot be confirmed (when flag on).
- **Matching state machine:** only legal transitions
  (`confirmed→checked_in→completed`, plus `canceled`/`noshow`); illegal transitions rejected.
- **Fee recording:** `completed` matching records the configured fee as `unpaid`.
- **Contract-type routing:** `employee`→`employment_daylabor`, `freelance`→`subcontract`.
- **Config precedence:** runtime override > env > default.
- **AuthZ:** role checks on every endpoint (worker can't approve completion, etc.).
- **Money math:** integer JPY; (Phase 2) withholding `9300` boundary, commission rounding.
- **i18n completeness:** `ja` and `en` catalogs have identical key sets (no missing/empty
  values), front-end and back-end. No hardcoded user-facing strings. See `11-i18n.md`.

## Test layers

| Layer | Tooling | Scope |
|---|---|---|
| **Backend unit** | `pytest` | pure logic: masking, fee calc, state machine, config, withholding (P2) |
| **Backend integration** | `pytest` + `httpx` + ephemeral Postgres (testcontainers or a CI Postgres) | endpoints against a real DB; auth via mocked Firebase verifier |
| **DB migrations** | Alembic upgrade/downgrade in CI | every migration is reversible & applies cleanly |
| **Frontend unit/component** | Vitest + React Testing Library | components, form validation, masking UX warnings |
| **E2E** | Playwright (Chromium preinstalled in this env) | full cycle: post→apply→confirm→checkin→checkout→review |
| **Contract** | schema check vs OpenAPI | web client types match API (`/openapi.json`) |

## Conventions
- Tests live next to the code in each app repo (`crafton-api`, `crafton-web`), not here.
- Deterministic: no real network, no real Firebase/GCP in unit/integration; use fakes.
- Seed/factory helpers for users, jobs, matchings.
- Name tests by behavior: `test_message_with_phone_number_is_blocked`.
- Every bug fix adds a regression test.

## CI gates (per app repo)
- Lint + type-check (ruff/mypy for Python; eslint/tsc for web).
- **i18n parity check:** `ja` ↔ `en` key sets match exactly (build fails otherwise).
- Unit + integration tests pass; migrations apply & reverse.
- E2E smoke on the core cycle before deploy.
- Block merge on failure.

## Phase 1 minimum bar (definition of done for testing)
- The full happy-path cycle has an E2E test.
- Masking, visa gate, state machine, fee recording, and authZ each have unit/integration
  tests.
- Migrations verified in CI.
