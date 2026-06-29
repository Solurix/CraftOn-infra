variable "project_id" {
  type        = string
  description = "GCP project ID for the dev environment."
  default     = "crafton-dev-500709" # project number 784671749504
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Primary region (Tokyo)."
}

variable "uploads_bucket_name" {
  type        = string
  description = "Globally-unique name for the uploads bucket, e.g. crafton-uploads-dev-<suffix>."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Dev DB password. Provide via TF_VAR_db_password or a *.auto.tfvars that is gitignored."
}

variable "api_image" {
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
  description = "Container image for the API service. Placeholder until CI/Make pushes a real one."
}

variable "web_image" {
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
  description = "Container image for the web service. Placeholder until CI/Make pushes a real one."
}

variable "sql_stopped" {
  type        = bool
  default     = false
  description = "If true, park the Cloud SQL instance (activation_policy=NEVER) to cut idle cost."
}

variable "github_owner" {
  type        = string
  default     = "Solurix"
  description = "GitHub org/owner allowed to use the Workload Identity provider."
}

variable "github_deploy_repos" {
  type        = list(string)
  default     = ["Solurix/CraftOn-api", "Solurix/CraftOn-web"]
  description = "owner/repo allowed to impersonate the deployer SA for Cloud Run deploys."
}
