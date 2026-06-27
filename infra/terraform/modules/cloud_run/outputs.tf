output "service_name" {
  value       = google_cloud_run_v2_service.this.name
  description = "Deployed Cloud Run service name."
}

output "uri" {
  value       = google_cloud_run_v2_service.this.uri
  description = "Public URL of the Cloud Run service."
}
