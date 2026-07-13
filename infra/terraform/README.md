# Terraform — CRAFT-ON infrastructure

Infrastructure-as-code for GCP (region `asia-northeast1`, Tokyo). See
`../../docs/adr/0006-terraform-iac.md` and `../../docs/02-architecture.md`.

> **Status:**
> - **`dev` — applied and live.** GCP project `crafton-dev-500709` (Tokyo); remote state
>   in the versioned bucket `gs://crafton-dev-500709-tfstate` (`environments/dev/backend.tf`).
>   The real app images run on Cloud Run with Cloud SQL, Storage, and Secret Manager wired.
> - **`prod` — still a skeleton.** Never applied, and it has **drifted from dev** — see the
>   warning block at the top of `environments/prod/main.tf` before the first apply.
>
> Day-to-day operations go through the **workspace-root `Makefile`** (dockerized
> Terraform — no local install needed): `make tf-apply` (plan+apply dev), plus
> `make api-image` / `make web-image` and `make gcp-start` / `gcp-stop` / `gcp-status`
> / `gcp-urls`.

## Layout

```
infra/terraform/
├── modules/
│   ├── project_services/   enable required GCP APIs
│   ├── storage/            Cloud Storage bucket (uploaded docs/images)
│   ├── secrets/            Secret Manager secrets
│   ├── database/           Cloud SQL (PostgreSQL)
│   └── cloud_run/          a generic Cloud Run service
└── environments/
    ├── dev/                dev root config (calls modules)
    └── prod/               prod root config (calls modules)
```

Each environment is a **root config** that instantiates the shared modules with its own
variables and its own remote state.

## First-time setup (once a GCP project + billing exist)

1. Create a GCS bucket for Terraform state, e.g. `crafton-tfstate-<env>` (versioned).
2. Fill `environments/<env>/backend.tf` with that bucket name.
3. Copy `terraform.tfvars.example` → `terraform.tfvars` and set values (project id, etc.).
4. Authenticate: `gcloud auth application-default login` (or a CI service account).
5. Run:
   ```
   cd environments/dev
   terraform init
   terraform plan
   terraform apply
   ```

## CI/CD & preview infra

`environments/dev/cicd.tf` holds the deployment plumbing for the app repos:
**Workload Identity Federation** (pool/provider `github-actions/github`, no stored
keys), the deployer service account `crafton-deployer@…`, and the least-privilege
custom role `craftonPreviewDbManager` (create/drop Cloud SQL databases for per-PR
preview environments). Per-PR previews themselves are documented in
[`../../docs/12-preview-environments.md`](../../docs/12-preview-environments.md).
Terraform apply stays **manual** (`make tf-apply`); the CI pipeline never runs Terraform.

## Notes
- **Firebase** (Auth, FCM, Firestore) is only partially Terraform-able. Create/enable the
  Firebase project and Auth providers via the Firebase console/CLI; document the steps and
  reference the resulting config from the apps. Tracked as a `TODO` in modules.
- **Secrets:** create secret *containers* in Terraform; set secret *values* out-of-band
  (console/CI), never in the repo or state where avoidable.
- Keep `dev` and `prod` as separate GCP projects (or strictly separated resources) with
  separate state.
- Run `terraform fmt` and `terraform validate` before committing.
