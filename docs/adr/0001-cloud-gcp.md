# ADR 0001 — Cloud provider: GCP (Tokyo region)

**Status:** Accepted · 2026-06

## Context
The plan named "AWS or GCP." We need cloud hosting for an app serving Japanese users,
handling Japanese personal data, and wanting strong managed AI/translation services.

## Decision
Use **Google Cloud Platform**, primary region **`asia-northeast1` (Tokyo)**.

## Consequences
- Data residency in Japan for personal data (helps APPI posture).
- Natural fit for Vertex AI (Gemini) and Cloud Translation (see ADR 0005).
- Core services: Cloud Run, Cloud SQL (Postgres), Cloud Storage, Secret Manager, Cloud
  Scheduler, Firebase (Auth/FCM/Firestore).
- Team standardizes on `gcloud` + Terraform GCP provider.
