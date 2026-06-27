variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "secret_ids" {
  type        = list(string)
  description = "Secret container IDs to create (values set out-of-band)."
  default     = []
}

variable "accessor_service_account" {
  type        = string
  description = "Email of the service account granted secretAccessor on these secrets. Null to skip."
  default     = null
}
