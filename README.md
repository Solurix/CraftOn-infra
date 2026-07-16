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

This is the **CRAFT-ON monorepo** — backend, frontend, infrastructure, and docs in
one place (ADR 0010; consolidated from the former `crafton`/`crafton-api`/`crafton-web`/
`crafton-mobile` repos). See [`docs/10-repo-strategy.md`](docs/10-repo-strategy.md).

```
CraftOn-infra/            ← the monorepo
├── api/                  ← FastAPI backend (SQLAlchemy + Alembic, pytest)
├── web/                  ← Next.js PWA (workers + contractors + gated /admin)
├── infra/terraform/      ← GCP infrastructure as code (environments + modules)
├── docs/                 ← all planning & design docs (start here)
├── scripts/              ← check.sh (quality gate) + api.sh helper
├── Makefile              ← single containerized entrypoint (make up / check / tf-*)
├── docker-compose.yml    ← local stack: db + api + web
├── CLAUDE.md             ← guide for GenAI-driven development sessions
└── README.md
```

Quick start: `cp .env.example .env && make up` (web → http://localhost:53000,
api → http://localhost:58000). `make help` lists all targets. There is **no mobile
app** — the installable PWA is the Android/iOS story.

## Start here

| If you want to… | Read |
|---|---|
| See what's done / in progress / next | [`docs/STATUS.md`](docs/STATUS.md) |
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
| Understand language / translations | [`docs/11-i18n.md`](docs/11-i18n.md) |
| Understand per-PR preview deployments | [`docs/12-preview-environments.md`](docs/12-preview-environments.md) |
| Decode a Japanese construction term | [`docs/glossary.md`](docs/glossary.md) |
| See *why* we chose X | [`docs/adr/`](docs/adr/) |

## Current status

- **Phase:** 1 — **feature-complete and deployed to dev** (GCP project
  `crafton-dev-500709`, Cloud Run in `asia-northeast1`); go-live prep remaining.
  See [`docs/STATUS.md`](docs/STATUS.md) for the live picture.
- **Decisions locked:** GCP, Terraform, Python/FastAPI backend, Next.js PWA frontend
  (web/PWA first), Vertex AI (Gemini) for AI features, single monorepo, region
  `asia-northeast1` (Tokyo), launch area Greater Tokyo. App default language Japanese
  with full English; development language English.
- **Next:** go-live prep — real Firebase auth wiring (dev still runs fake auth),
  an email provider for verification/reset emails, legal sign-off on the terms
  wording, and hardening (API ingress/auth, private Cloud SQL IP). See
  [`docs/STATUS.md`](docs/STATUS.md) "Next up".

## Development philosophy

Development is **GenAI-centered**: every decision, spec, and convention is written
down so that any AI coding session can continue work without losing context. If you
change a decision, update the relevant doc **in the same change**. See
[`CLAUDE.md`](CLAUDE.md).
