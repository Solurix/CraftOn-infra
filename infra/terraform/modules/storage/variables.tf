variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "bucket_name" {
  type        = string
  description = "Globally-unique bucket name for uploads."
}

variable "location" {
  type        = string
  description = "Bucket location."
  default     = "asia-northeast1"
}

variable "uploads_retention_days" {
  type        = number
  description = "Days to retain uploaded documents before lifecycle deletion. Tune per legal guidance."
  default     = 365
}
