# Terraform — CRAFT-ON infrastructure

Infrastructure-as-code for GCP (region `asia-northeast1`, Tokyo). See
`../../docs/adr/0006-terraform-iac.md` and `../../docs/02-architecture.md`.

> **Status: skeleton.** Not yet `apply`-able — needs a GCP project + billing account and
> the remote-state bucket (see "First-time setup"). It compiles structurally; fill in the
> blanks marked `TODO` and the `terraform.tfvars` per environment.

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

## Notes
- **Firebase** (Auth, FCM, Firestore) is only partially Terraform-able. Create/enable the
  Firebase project and Auth providers via the Firebase console/CLI; document the steps and
  reference the resulting config from the apps. Tracked as a `TODO` in modules.
- **Secrets:** create secret *containers* in Terraform; set secret *values* out-of-band
  (console/CI), never in the repo or state where avoidable.
- Keep `dev` and `prod` as separate GCP projects (or strictly separated resources) with
  separate state.
- Run `terraform fmt` and `terraform validate` before committing.
