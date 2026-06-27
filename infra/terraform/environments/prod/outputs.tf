output "api_url" {
  value       = module.api.uri
  description = "Prod API base URL."
}

output "web_url" {
  value       = module.web.uri
  description = "Prod web/PWA URL."
}

output "uploads_bucket" {
  value       = module.storage.bucket_name
  description = "Uploads bucket name."
}

output "db_connection_name" {
  value       = module.database.instance_connection_name
  description = "Cloud SQL connection name for the connector."
}
