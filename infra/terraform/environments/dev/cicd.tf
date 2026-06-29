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
