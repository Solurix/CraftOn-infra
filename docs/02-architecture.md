# 02 — Architecture & Tech Stack

## Stack summary

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js (React + TypeScript)** as a mobile-first **PWA** | One codebase serves contractors (desktop/mobile) and workers (mobile). Installable; web push + SMS for reminders. |
| Backend | **Python + FastAPI** | Async, Pydantic validation, auto OpenAPI docs. |
| ORM / migrations | **SQLAlchemy + Alembic** | All schema changes via Alembic migrations. |
| Database | **PostgreSQL** on **Cloud SQL** | Relational; UUID PKs, enums, FKs. |
| Auth | **Firebase Auth** (phone OTP) | Phone-number login; works on web. |
| Push | **Firebase Cloud Messaging (FCM)** | Web push for reminders; SMS fallback. |
| In-app chat | **Firestore** (Phase 1) | Real-time; easy to add contact-masking filter. May move to Postgres+websockets later. |
| File storage | **Cloud Storage** | ID/qualification images; encrypted, signed URLs, lifecycle/retention rules. |
| API hosting | **Cloud Run** | Serverless containers; cheap at low volume, autoscaling. |
| Web hosting | **Cloud Run** (or Firebase Hosting) | Next.js served via Cloud Run for SSR. |
| Scheduled jobs | **Cloud Scheduler + Cloud Run Jobs** | Visa-expiry check, monthly billing batch. |
| AI (later) | **Vertex AI — Gemini** | Instruction sheets; abstracted behind an interface so the model is a config var. |
| Translation (later) | **Cloud Translation API** | Multilingual instructions. |
| Secrets | **Secret Manager** | No secrets in code or repos. |
| Observability | **Cloud Logging + Monitoring** | Structured logs. |
| IaC | **Terraform** (GCS remote state) | Everything provisioned as code. See `infra/terraform/`. |
| Region | **asia-northeast1 (Tokyo)** | Data residency for Japanese personal data (APPI). |

> Why Python over Node: best Vertex AI/Gemini SDK support, the tax logic is already in
> Python, batch jobs are natural in Python. Trade-off: 3 languages total (Dart not used
> yet — PWA first; TypeScript on web; Python on API). See `docs/adr/0002-backend-python-fastapi.md`.

## System diagram (Phase 1)

```
                        ┌─────────────────────────────┐
                        │  Users (browsers / installed │
                        │  PWA on phone & desktop)      │
                        └───────────────┬──────────────┘
                                        │ HTTPS
                        ┌───────────────▼──────────────┐
                        │  crafton-web (Next.js PWA)    │  Cloud Run
                        │  - worker UI (mobile-first)   │
                        │  - contractor UI              │
                        │  - minimal internal admin     │
                        └───────────────┬──────────────┘
                                        │ REST (JSON)
                        ┌───────────────▼──────────────┐
                        │  crafton-api (FastAPI)        │  Cloud Run
                        │  - jobs / matching / reviews  │
                        │  - profiles / vetting         │
                        │  - check-in/out, contact mask │
                        └───┬───────────┬───────────┬───┘
                            │           │           │
              ┌─────────────▼──┐  ┌─────▼─────┐  ┌──▼─────────────┐
              │ Cloud SQL      │  │ Cloud     │  │ Firebase       │
              │ (PostgreSQL)   │  │ Storage   │  │ Auth + FCM +   │
              │ core data      │  │ (images)  │  │ Firestore chat │
              └────────────────┘  └───────────┘  └────────────────┘

  Cloud Scheduler ──► Cloud Run Job (batch)   Secret Manager (config/secrets)
  (Phase 1: minimal; grows in Phase 2)
```

## Phase 2+ additions (not built yet)

- In-app payment (Square/Stripe link → then BtoB factoring: NP掛け払い / Money Forward
  Kessai), worker payout via bank transfer API.
- Auto withholding tax engine; proxy invoice generation.
- 1-day add-on insurance auto-attach (insurer API or monthly batch report).
- eKYC integration (TRUSTDOCK or similar) for automated residence-card validity /
  work-restriction checks; optional JPKI (My Number **card**) auth.
- Vertex AI Gemini for AI instruction sheets; Cloud Translation for multilingual.
- Green Site / CCUS CSV export (and CCUS API if access is granted).

## Environments

- `dev` and `prod` (add `staging` if/when needed). Each is a separate GCP project (or
  clearly separated resources) provisioned by Terraform. See `infra/terraform/`.

## Key cross-cutting principles

- **Config-driven:** business limits are vars/flags (`docs/07-config-and-flags.md`).
- **Compliance by design:** visa gate, contact masking, check-in/out status are in the
  DB schema from day one even if logic is minimal (`docs/08-compliance-legal.md`).
- **Stateless API:** Cloud Run instances are stateless; all state in Postgres / Storage /
  Firestore.
