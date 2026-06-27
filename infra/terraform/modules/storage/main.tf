# Cloud Storage bucket for uploaded documents/images (IDs, residence cards, job photos).
# Access is via signed URLs from the API; the bucket is private. Encrypted at rest.
# Retention/lifecycle keeps sensitive docs only as long as needed
# (see ../../../../docs/08-compliance-legal.md).

resource "google_storage_bucket" "uploads" {
  name                        = var.bucket_name
  project                     = var.project_id
  location                    = var.location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # TODO: tune retention for ID documents per legal guidance. Example lifecycle:
  lifecycle_rule {
    condition {
      age = var.uploads_retention_days
    }
    action {
      type = "Delete"
    }
  }
}
