# ADR 0003 — Multi-repo (not monorepo)

**Status:** Accepted · 2026-06

## Context
Owner preference: separate repositories. This repo (`crafton`) holds infra + docs +
governance; application code lives elsewhere.

## Decision
Use **multiple repositories**:
- `crafton` — infra (Terraform), docs, governance (this repo).
- `crafton-api` — FastAPI backend (to create).
- `crafton-web` — Next.js PWA (to create).
- `crafton-mobile` — Flutter (later, only if needed).

## Consequences
- Clear separation; each repo has its own CI and release cadence.
- Need explicit cross-repo coordination: `crafton` is the hub; each repo links back and
  pins decisions in its `CLAUDE.md`. API contract changes are mirrored in
  `docs/06-api-contract.md`. See `docs/10-repo-strategy.md`.
- Slightly more overhead than a monorepo (dependency/version coordination), accepted for
  the cleaner boundaries.
