# A generic Cloud Run (v2) service, reused for the API and the web app.
# Image is built/pushed by each app repo's CI to Artifact Registry; this just deploys it.

resource "google_cloud_run_v2_service" "this" {
  name     = var.service_name
  project  = var.project_id
  location = var.region

  template {
    service_account = var.service_account_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secrets are mounted as env vars referencing Secret Manager.
      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      # Cloud SQL unix socket, mounted at /cloudsql/<connection_name>.
      dynamic "volume_mounts" {
        for_each = length(var.cloudsql_instances) > 0 ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }

    # Attach Cloud SQL instances (uses the built-in Cloud SQL connector; works with
    # public-IP instances). TODO (prod): prefer private IP + Serverless VPC connector.
    dynamic "volumes" {
      for_each = length(var.cloudsql_instances) > 0 ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = var.cloudsql_instances
        }
      }
    }
  }
}

# Public ingress toggle. APIs may want auth; the web app is public.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_public ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
