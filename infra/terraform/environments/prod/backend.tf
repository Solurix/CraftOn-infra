# Remote state in GCS. Create the bucket once (versioned) before `terraform init`.
# TODO: set the bucket name, then uncomment.
#
# terraform {
#   backend "gcs" {
#     bucket = "crafton-tfstate-prod"
#     prefix = "env/prod"
#   }
# }
