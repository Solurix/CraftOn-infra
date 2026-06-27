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
