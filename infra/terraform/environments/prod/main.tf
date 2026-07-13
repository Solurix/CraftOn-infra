# =============================================================================
# WARNING — PROD IS AN UNAPPLIED SKELETON AND HAS DRIFTED FROM DEV.
#
# This config has never been applied and would NOT boot as written. Before the
# first `terraform apply`, bring it to parity with environments/dev/main.tf.
# Known gaps (as of 2026-07-11):
#
#   1. Wrong env-var names: the apps use the CRAFTON_* contract
#      (see crafton/docs/07-config-and-flags.md), not APP_ENV / DB_NAME /
#      DB_USER / GCS_BUCKET as set below.
#   2. Database URL must be delivered via secret_env (Secret Manager secret
#      `crafton-db-url` mounted as CRAFTON_DATABASE_URL), as dev does — not as
#      plain DB_NAME/DB_USER env vars.
#   3. The web service's runtime API_BASE_URL below is dead config: the web app
#      bakes NEXT_PUBLIC_API_BASE_URL into the image at BUILD time (see the
#      crafton-web CI deploy job); a runtime env var has no effect.
#   4. Missing dedicated runtime service account wiring (dev attaches one with
#      Cloud SQL / Storage / Secret accessor roles).
#   5. Missing Artifact Registry repository (dev: `crafton` in asia-northeast1)
#      and image references.
#   6. Missing cicd.tf (Workload Identity Federation pool/provider, deployer SA,
#      craftonPreviewDbManager custom role) — dev has environments/dev/cicd.tf.
#
# Do not copy values blindly; diff against environments/dev/main.tf and port the
# CRAFTON_* env contract, secret wiring, SA, and registry before first apply.
# =============================================================================

# Prod environment — same modules as dev, hardened settings.
# Differences vs dev: HA database, PITR, deletion protection, no public DB IP (TODO: VPC),
# min 1 API instance to avoid cold starts.

module "services" {
  source     = "../../modules/project_services"
  project_id = var.project_id
}

module "storage" {
  source                 = "../../modules/storage"
  project_id             = var.project_id
  bucket_name            = var.uploads_bucket_name
  location               = var.region
  uploads_retention_days = 365 # TODO: confirm with legal (08-compliance-legal.md)

  depends_on = [module.services]
}

module "database" {
  source              = "../../modules/database"
  project_id          = var.project_id
  region              = var.region
  instance_name       = "crafton-prod"
  tier                = "db-custom-1-3840" # TODO: size to load
  availability_type   = "REGIONAL"
  pitr_enabled        = true
  deletion_protection = true
  public_ip_enabled   = false # TODO: pair with Serverless VPC connector in cloud_run
  db_password         = var.db_password

  depends_on = [module.services]
}

module "secrets" {
  source     = "../../modules/secrets"
  project_id = var.project_id
  secret_ids = [
    "crafton-db-url",
    "crafton-firebase-config",
  ]

  depends_on = [module.services]
}

module "api" {
  source        = "../../modules/cloud_run"
  project_id    = var.project_id
  region        = var.region
  service_name  = "crafton-api-prod"
  min_instances = 1
  max_instances = 10
  allow_public  = true # TODO: front with auth/ingress controls
  env = {
    APP_ENV    = "prod"
    DB_NAME    = module.database.db_name
    DB_USER    = module.database.db_user
    GCS_BUCKET = module.storage.bucket_name
  }

  depends_on = [module.services]
}

module "web" {
  source        = "../../modules/cloud_run"
  project_id    = var.project_id
  region        = var.region
  service_name  = "crafton-web-prod"
  min_instances = 1
  max_instances = 10
  allow_public  = true
  env = {
    APP_ENV      = "prod"
    API_BASE_URL = module.api.uri
  }

  depends_on = [module.services]
}
