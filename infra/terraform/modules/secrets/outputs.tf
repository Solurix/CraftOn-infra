output "secret_ids" {
  description = "Created secret container IDs."
  value       = [for s in google_secret_manager_secret.this : s.secret_id]
}
