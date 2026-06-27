output "enabled_services" {
  description = "List of enabled service identifiers."
  value       = [for s in google_project_service.enabled : s.service]
}
