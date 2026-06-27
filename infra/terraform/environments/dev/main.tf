# Dev environment — wires the shared modules together.
# Cheapest-possible settings (scale to zero, small DB, public IP) for development.

module "services" {
  source     = "../../modules/project_services"
  project_id = var.project_id
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

  depends_on = [module.services]
}

# API service (private by default; web app calls it with a Firebase token).
module "api" {
  source       = "../../modules/cloud_run"
  project_id   = var.project_id
  region       = var.region
  service_name = "crafton-api-dev"
  allow_public = true # TODO: lock down once auth/ingress is finalized
  env = {
    APP_ENV  = "dev"
    DB_NAME  = module.database.db_name
    DB_USER  = module.database.db_user
    GCS_BUCKET = module.storage.bucket_name
  }
  # image is the placeholder until crafton-api CI publishes a real image.

  depends_on = [module.services]
}

# Web/PWA service (public).
module "web" {
  source       = "../../modules/cloud_run"
  project_id   = var.project_id
  region       = var.region
  service_name = "crafton-web-dev"
  allow_public = true
  env = {
    APP_ENV      = "dev"
    API_BASE_URL = module.api.uri
  }

  depends_on = [module.services]
}
