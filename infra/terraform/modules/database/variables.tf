variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for the Cloud SQL instance."
}

variable "instance_name" {
  type        = string
  description = "Cloud SQL instance name."
}

variable "database_version" {
  type        = string
  default     = "POSTGRES_16"
  description = "PostgreSQL version."
}

variable "tier" {
  type        = string
  default     = "db-f1-micro"
  description = "Machine tier. Small for dev; size up for prod."
}

variable "availability_type" {
  type        = string
  default     = "ZONAL"
  description = "ZONAL (dev) or REGIONAL (prod HA)."
}

variable "pitr_enabled" {
  type        = bool
  default     = false
  description = "Point-in-time recovery. Enable in prod."
}

variable "public_ip_enabled" {
  type        = bool
  default     = true
  description = "Public IP. Prefer false + private IP in prod."
}

variable "activation_policy" {
  type        = string
  default     = "ALWAYS"
  description = "ALWAYS = running; NEVER = stopped (park to cut idle cost in dev)."
}

variable "edition" {
  type        = string
  default     = "ENTERPRISE"
  description = "Cloud SQL edition. ENTERPRISE supports shared-core tiers (db-f1-micro); ENTERPRISE_PLUS does not."
}

variable "deletion_protection" {
  type        = bool
  default     = true
  description = "Protect the instance from deletion."
}

variable "db_name" {
  type        = string
  default     = "crafton"
  description = "Application database name."
}

variable "db_user" {
  type        = string
  default     = "crafton_app"
  description = "Application database user."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "DB user password. Inject from a generated secret; never commit a value."
}
