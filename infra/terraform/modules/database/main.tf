# Cloud SQL (PostgreSQL) instance + application database.
# Connection details (host/user/password) are exposed to the API via Secret Manager,
# not hardcoded. Password is generated and stored as a secret out-of-band, or injected.

resource "google_sql_database_instance" "this" {
  name             = var.instance_name
  project          = var.project_id
  region           = var.region
  database_version = var.database_version

  settings {
    tier              = var.tier
    availability_type = var.availability_type
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.pitr_enabled
    }

    ip_configuration {
      # TODO: prefer Private IP / VPC + Serverless VPC connector for Cloud Run in prod.
      ipv4_enabled = var.public_ip_enabled
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "app" {
  name     = var.db_name
  project  = var.project_id
  instance = google_sql_database_instance.this.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  # TODO: set password via variable from a generated secret; do not commit a value.
  password = var.db_password
}
