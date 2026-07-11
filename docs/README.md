# CRAFT-ON docs — index & reading order

All planning, design, and governance documentation for CRAFT-ON lives here. This
repo (`crafton`) is the **source of truth**; the app repos (`crafton-api`,
`crafton-web`) link back to these docs.

## Reading order for a new AI session

1. [`../CLAUDE.md`](../CLAUDE.md) — golden rules, locked decisions, session checklist.
2. [`STATUS.md`](STATUS.md) — current state: what's done, in progress, and next.
3. [`03-roadmap.md`](03-roadmap.md) — phases and what belongs in each.
4. [`04-phase-1-spec.md`](04-phase-1-spec.md) — the spec for the current phase.
5. Then the reference docs below, as needed for the task at hand.

## All documents

| Doc | Purpose |
|---|---|
| [`01-overview.md`](01-overview.md) | Plain-English product overview: what CRAFT-ON is and who it serves |
| [`02-architecture.md`](02-architecture.md) | Tech stack and system architecture (GCP, FastAPI, Next.js PWA) |
| [`03-roadmap.md`](03-roadmap.md) | Build phases and scope discipline (Phase 0/1/2/3) |
| [`04-phase-1-spec.md`](04-phase-1-spec.md) | Detailed spec of the Phase 1 MVP (screens, flows, build order) |
| [`05-data-model.md`](05-data-model.md) | Database schema narrative (tables, columns, enums) |
| [`06-api-contract.md`](06-api-contract.md) | REST API endpoint overview (FastAPI OpenAPI is authoritative) |
| [`07-config-and-flags.md`](07-config-and-flags.md) | Every config var / feature flag with defaults — never hardcode these |
| [`08-compliance-legal.md`](08-compliance-legal.md) | Legal/compliance rules: visa gate, contact masking, My Number, APPI |
| [`09-testing-strategy.md`](09-testing-strategy.md) | What must be tested and how (business rules first) |
| [`10-repo-strategy.md`](10-repo-strategy.md) | Multi-repo layout: which code lives in which repository |
| [`11-i18n.md`](11-i18n.md) | i18n policy: Japanese default, full English, key parity in CI |
| [`12-preview-environments.md`](12-preview-environments.md) | Per-PR Cloud Run preview environments (design + postmortem) |
| [`STATUS.md`](STATUS.md) | Living progress tracker: current state, next up, open questions |
| [`CHANGELOG.md`](CHANGELOG.md) | Session history (newest first) and the done ledger |
| [`glossary.md`](glossary.md) | Japanese construction & domain terms used across the docs |
| [`phase-1-kickoff-prompt.md`](phase-1-kickoff-prompt.md) | Paste-ready kickoff prompt for a fresh Phase 1 coding session |
| [`adr/`](adr/README.md) | Architecture Decision Records — why each locked decision was made |
