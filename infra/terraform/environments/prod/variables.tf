variable "project_id" {
  type        = string
  description = "GCP project ID for the prod environment."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Primary region (Tokyo)."
}

variable "uploads_bucket_name" {
  type        = string
  description = "Globally-unique name for the uploads bucket, e.g. crafton-uploads-prod-<suffix>."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Prod DB password. Provide via TF_VAR_db_password / generated secret; never commit."
}
