output "instance_connection_name" {
  description = "Cloud SQL connection name (project:region:instance) for the Cloud SQL connector."
  value       = google_sql_database_instance.this.connection_name
}

output "instance_name" {
  value       = google_sql_database_instance.this.name
  description = "Cloud SQL instance name."
}

output "db_name" {
  value       = google_sql_database.app.name
  description = "Application database name."
}

output "db_user" {
  value       = google_sql_user.app.name
  description = "Application database user."
}
