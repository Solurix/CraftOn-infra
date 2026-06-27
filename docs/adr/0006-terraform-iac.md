# ADR 0006 — Terraform for Infrastructure as Code

**Status:** Accepted · 2026-06

## Context
Owner chose Terraform ("tf"). All GCP infrastructure should be reproducible and reviewed.

## Decision
- Provision all GCP infrastructure with **Terraform**, stored in this repo under
  `infra/terraform/`.
- **Remote state in a GCS bucket** (per environment); state locking via GCS.
- Structure: reusable **modules** + per-environment configs (`environments/dev`, `prod`).
- Service accounts and IAM are managed in Terraform (least privilege).

## Consequences
- Infra changes are code-reviewed and reproducible across `dev`/`prod`.
- Some **Firebase** resources aren't fully Terraform-able and may need the Firebase CLI /
  console; those steps are documented in `infra/terraform/README.md`.
- `terraform apply` requires a GCP project + billing (currently a blocker — see STATUS).
- Secrets are created/managed via Secret Manager (values not stored in state where
  avoidable; never in the repo).
