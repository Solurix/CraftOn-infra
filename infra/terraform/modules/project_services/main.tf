# Enable the GCP APIs the platform needs.
# See ../../../../docs/02-architecture.md for what each is used for.

locals {
  required_services = [
    "run.googleapis.com",                 # Cloud Run (API + web)
    "sqladmin.googleapis.com",            # Cloud SQL (PostgreSQL)
    "storage.googleapis.com",             # Cloud Storage (uploads)
    "secretmanager.googleapis.com",       # Secret Manager
    "cloudscheduler.googleapis.com",      # Cloud Scheduler (batch jobs)
    "artifactregistry.googleapis.com",    # container images
    "iam.googleapis.com",
    "cloudtranslate.googleapis.com",      # Cloud Translation (Phase 3)
    "aiplatform.googleapis.com",          # Vertex AI / Gemini (Phase 3)
    "firebase.googleapis.com",            # Firebase (Auth/FCM/Firestore)
  ]
}

resource "google_project_service" "enabled" {
  for_each = toset(local.required_services)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
