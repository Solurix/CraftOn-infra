# Dev environment — wires the shared modules together.
# Cheapest-possible settings (scale to zero, small DB, public IP) for development.

module "services" {
  source     = "../../modules/project_services"
  project_id = var.project_id
}

# Container image registry for the API + web images (built/pushed by Make/CI).
resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = "crafton"
  format        = "DOCKER"
  description   = "CraftOn app container images (api, web)."

  depends_on = [module.services]
}

# Dedicated runtime service account for the API (DB + secret access).
resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = "crafton-api-dev"
  display_name = "CraftOn API (dev) runtime"
}

# The API connects to Cloud SQL via the built-in connector.
resource "google_project_iam_member" "api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

module "storage" {
  source      = "../../modules/storage"
  project_id  = var.project_id
  bucket_name = var.uploads_bucket_name
  location    = var.region

  depends_on = [module.services]
}

module "database" {
  source        = "../../modules/database"
  project_id    = var.project_id
  region        = var.region
  instance_name = "crafton-dev"
  tier          = "db-f1-micro"
  # Dev convenience: allow deletion + public IP. Lock these down in prod.
  deletion_protection = false
  public_ip_enabled   = true
  db_password         = var.db_password
  activation_policy   = var.sql_stopped ? "NEVER" : "ALWAYS"

  depends_on = [module.services]
}

module "secrets" {
  source     = "../../modules/secrets"
  project_id = var.project_id
  secret_ids = [
    "crafton-db-url",
    "crafton-firebase-config",
    # Phase 2+ (containers created early, values later):
    # "crafton-factoring-api-key",
    # "crafton-ekyc-api-key",
  ]
  # Let the API runtime SA read these secrets.
  accessor_service_account = google_service_account.api.email

  depends_on = [module.services]
}

# SQLAlchemy URL (psycopg) over the Cloud SQL unix socket. Stored in Secret Manager
# and injected into the API as CRAFTON_DATABASE_URL. db_password is alphanumeric, so
# no URL-encoding is required.
locals {
  database_url = "postgresql+psycopg://${module.database.db_user}:${var.db_password}@/${module.database.db_name}?host=/cloudsql/${module.database.instance_connection_name}"
}

resource "google_secret_manager_secret_version" "db_url" {
  secret      = "projects/${var.project_id}/secrets/crafton-db-url"
  secret_data = local.database_url

  depends_on = [module.secrets]
}

# API service (public for dev; auth_mode=fake until the real Firebase project is wired).
module "api" {
  source                = "../../modules/cloud_run"
  project_id            = var.project_id
  region                = var.region
  service_name          = "crafton-api-dev"
  image                 = var.api_image
  service_account_email = google_service_account.api.email
  allow_public          = true # TODO: lock down once auth/ingress is finalized
  env = {
    CRAFTON_ENV                 = "dev"
    CRAFTON_AUTH_MODE           = "fake"
    CRAFTON_FIREBASE_PROJECT_ID = var.project_id
    CRAFTON_STORAGE_MODE        = "fake"
    CRAFTON_GCS_BUCKET          = module.storage.bucket_name
    # NOTE: do not set CRAFTON_SUPPORTED_LANGUAGES here — pydantic-settings JSON-decodes
    # list fields from env at the source level (before the validator), so "ja,en" errors.
    # The app default is already ["ja","en"].
  }
  # DB URL comes from Secret Manager (set by google_secret_manager_secret_version.db_url).
  secret_env = {
    CRAFTON_DATABASE_URL = "crafton-db-url"
  }
  cloudsql_instances = [module.database.instance_connection_name]

  depends_on = [
    module.services,
    google_secret_manager_secret_version.db_url,
    google_project_iam_member.api_cloudsql_client,
  ]
}

# Web/PWA service (public). NEXT_PUBLIC_* config is baked into the image at build time;
# the API base URL is therefore passed as a build arg, not a runtime env var.
module "web" {
  source       = "../../modules/cloud_run"
  project_id   = var.project_id
  region       = var.region
  service_name = "crafton-web-dev"
  image        = var.web_image
  allow_public = true
  env = {
    APP_ENV = "dev"
  }

  depends_on = [module.services]
}
