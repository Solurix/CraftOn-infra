# Secret Manager containers. Values are set OUT OF BAND (console/CI), never in the repo
# or committed tfvars. This module only creates the secret containers + access bindings.

resource "google_secret_manager_secret" "this" {
  for_each = toset(var.secret_ids)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }
}

# Grant the runtime service account read access to all secrets in this module.
resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = var.accessor_service_account == null ? toset([]) : toset(var.secret_ids)

  project   = var.project_id
  secret_id = google_secret_manager_secret.this[each.value].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.accessor_service_account}"
}
