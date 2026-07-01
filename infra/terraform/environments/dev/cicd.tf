# CI/CD identity for GitHub Actions.
# App repos (crafton-api, crafton-web) deploy to Cloud Run on push to main via
# Workload Identity Federation — no long-lived service-account keys. Terraform apply
# stays manual; this just provisions the trust + deployer permissions the workflows use.

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "crafton-deployer"
  display_name = "CraftOn CI/CD deployer (dev)"
}

# Build/push images + deploy (update) Cloud Run services.
resource "google_project_iam_member" "deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# Required to deploy a service that runs *as* a runtime SA (actAs), even when the
# deploy only changes the image. Project-scoped for dev simplicity; tighten in prod.
resource "google_project_iam_member" "deployer_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# ── Per-PR preview databases ──────────────────────────────────────────────────
# The preview-deploy workflows create an isolated `crafton_pr<N>` database per PR
# and drop it on close. That needs Cloud SQL *database* create/delete on the shared
# `crafton-dev` instance — scoped to exactly those verbs (a least-privilege custom
# role) rather than the broad roles/cloudsql.admin. The preview revisions still run
# as the runtime SA (crafton-api-dev@, which already has roles/cloudsql.client), so
# the deployer needs no instance-level or data-plane access beyond this.
resource "google_project_iam_custom_role" "preview_db_manager" {
  project     = var.project_id
  role_id     = "craftonPreviewDbManager"
  title       = "CraftOn Preview DB Manager"
  description = "Create/drop per-PR preview databases on Cloud SQL."
  permissions = [
    "cloudsql.databases.create",
    "cloudsql.databases.delete",
    "cloudsql.databases.get",
    "cloudsql.databases.list",
    "cloudsql.instances.get",
  ]
}

resource "google_project_iam_member" "deployer_preview_db" {
  project = var.project_id
  role    = google_project_iam_custom_role.preview_db_manager.id
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# ── Workload Identity Federation (GitHub OIDC) ────────────────────────────────
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "OIDC trust for Solurix CraftOn app repos."

  depends_on = [module.services]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }
  # Only tokens from our GitHub org may use this provider.
  attribute_condition = "assertion.repository_owner == \"${var.github_owner}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Let the specific app repos impersonate the deployer SA.
resource "google_service_account_iam_member" "deployer_wif" {
  for_each = toset(var.github_deploy_repos)

  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${each.value}"
}

output "deployer_service_account" {
  value       = google_service_account.deployer.email
  description = "Service account the GitHub Actions deploy jobs impersonate."
}

output "wif_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full resource name for the workflow's workload_identity_provider input."
}
