# CRAFT-ON

**On-demand "spot matching" platform for construction tradespeople in Japan.**

CRAFT-ON solves the everyday emergency on a building site — *"we're short a worker
tomorrow!"* — in minutes, then helps run the job (paperwork, translation, safety) in
one place. Workers use it for free; contractors (工務店 / site supervisors) pay.

> One-liner: **Timee, but built for construction sites** — matching + on-site
> management DX, with first-class support for foreign workers and the legal/tax
> realities of Japanese construction labor.

---

## What this repository is

This is the **`crafton` core repo**: it holds **infrastructure (Terraform),
documentation, and project-wide "source of truth" material**. Application code
(backend API, web app) lives in **separate repositories** created later — see
[`docs/10-repo-strategy.md`](docs/10-repo-strategy.md).

```
crafton/                  ← you are here (infra + docs + governance)
├── docs/                 ← all planning & design docs (start here)
├── infra/terraform/      ← GCP infrastructure as code
├── CLAUDE.md             ← guide for GenAI-driven development sessions
└── README.md
```

## Start here

| If you want to… | Read |
|---|---|
| Understand what we're building | [`docs/01-overview.md`](docs/01-overview.md) |
| See the tech stack & architecture | [`docs/02-architecture.md`](docs/02-architecture.md) |
| See the build plan / phases | [`docs/03-roadmap.md`](docs/03-roadmap.md) |
| **Build Phase 1 (the working app)** | [`docs/04-phase-1-spec.md`](docs/04-phase-1-spec.md) |
| Look up the database schema | [`docs/05-data-model.md`](docs/05-data-model.md) |
| Look up API endpoints | [`docs/06-api-contract.md`](docs/06-api-contract.md) |
| Find a config var / feature flag | [`docs/07-config-and-flags.md`](docs/07-config-and-flags.md) |
| Understand the legal/compliance rules | [`docs/08-compliance-legal.md`](docs/08-compliance-legal.md) |
| Understand how we test | [`docs/09-testing-strategy.md`](docs/09-testing-strategy.md) |
| See how repos are organized | [`docs/10-repo-strategy.md`](docs/10-repo-strategy.md) |
| Decode a Japanese construction term | [`docs/glossary.md`](docs/glossary.md) |
| See *why* we chose X | [`docs/adr/`](docs/adr/) |

## Current status

- **Phase:** 0 → 1 (foundation laid; Phase 1 app not yet built).
- **Decisions locked:** GCP, Terraform, Python/FastAPI backend, Next.js PWA frontend
  (web/PWA first), Vertex AI (Gemini) for AI features, multi-repo, region
  `asia-northeast1` (Tokyo), launch area Greater Tokyo.
- **Next:** create app repos and scaffold the Phase 1 PWA + API per
  [`docs/04-phase-1-spec.md`](docs/04-phase-1-spec.md).

## Development philosophy

Development is **GenAI-centered**: every decision, spec, and convention is written
down so that any AI coding session can continue work without losing context. If you
change a decision, update the relevant doc **in the same change**. See
[`CLAUDE.md`](CLAUDE.md).
