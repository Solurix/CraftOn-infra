# ADR 0008 — i18n: Japanese default, full English, English dev language

**Status:** Accepted · 2026-06

## Context
The product serves Japanese construction sites; users expect Japanese. The team and all
tooling work in English. We need a policy that keeps end-users Japanese-first without
forcing English-speaking developers to read Japanese source code.

## Decision
- **Default app locale: Japanese (`ja`).**
- **English (`en`) is a complete, first-class locale** — 100% key parity with `ja`,
  enforced in CI. Not partial, not deferred.
- **Development language remains English:** identifiers, comments, docs, commit messages,
  and i18n **message keys** are English.
- Message **keys** are English; default **rendered** locale is Japanese.
- Locale resolves as: user `preferred_language` → `Accept-Language` → `ja` fallback.
- Static UI i18n is distinct from Phase 3 machine translation of dynamic instructions.
- Recommended tooling: `next-intl` (web) + a small catalog layer (API). Full details in
  `docs/11-i18n.md`.

## Consequences
- Both `ja` and `en` catalogs ship from Phase 1; a CI parity check blocks merges that
  break completeness.
- No hardcoded user-facing strings anywhere; all copy is keyed.
- Backend user-facing text (errors, SMS/push/email, terms PDFs) is also localized, not
  just the frontend.
- Future locales (`vi`, `id`) slot in via new catalogs without code changes; only `ja`/`en`
  are held to the always-complete bar.
