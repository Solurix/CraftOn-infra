# ADR 0005 — AI via Vertex AI, Gemini models

**Status:** Accepted · 2026-06

## Context
The plan mentioned LLMs for AI instruction-sheet generation (OpenAI or Claude) and a
translation API. We're on GCP and want to control cost.

## Decision
- Use **Vertex AI** with **Gemini** models (cheaper than Claude) for AI features (e.g.
  safety/KY instruction sheets) — Phase 3.
- Use **Cloud Translation API** for machine translation of instructions — Phase 3.
- **Abstract the LLM behind an interface** so the specific model is a **config var**
  (`07-config-and-flags.md`); we can swap Gemini Flash/Pro or another provider later
  without rewrites.

## Consequences
- Keeps AI inside GCP (IAM, billing, data residency) and lowers per-call cost.
- Provider-agnostic seam means future model swaps are config, not code changes.
- AI features are flag-gated off until Phase 3 (`ai_instruction_sheets_enabled`,
  `translation_enabled`).
