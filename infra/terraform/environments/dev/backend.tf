# Remote state in GCS. The bucket (versioned) is created once via `make bootstrap-state`.
terraform {
  backend "gcs" {
    bucket = "crafton-dev-500709-tfstate"
    prefix = "env/dev"
  }
}
