variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for the Cloud Run service."
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name."
}

variable "image" {
  type        = string
  description = "Container image (Artifact Registry). Use a placeholder until CI pushes one."
  default     = "us-docker.pkg.dev/cloudrun/container/hello" # placeholder until app CI publishes
}

variable "service_account_email" {
  type        = string
  description = "Runtime service account email."
  default     = null
}

variable "min_instances" {
  type        = number
  default     = 0
  description = "Min instances (0 = scale to zero, cheapest)."
}

variable "max_instances" {
  type        = number
  default     = 4
  description = "Max instances."
}

variable "env" {
  type        = map(string)
  default     = {}
  description = "Plain environment variables."
}

variable "secret_env" {
  type        = map(string)
  default     = {}
  description = "Map of ENV_VAR_NAME => Secret Manager secret id, mounted as env vars."
}

variable "cloudsql_instances" {
  type        = list(string)
  default     = []
  description = "Cloud SQL connection names (project:region:instance) to attach via the connector."
}

variable "allow_public" {
  type        = bool
  default     = false
  description = "If true, allow unauthenticated invocation (e.g. the web app)."
}
