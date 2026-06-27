output "bucket_name" {
  description = "Name of the uploads bucket."
  value       = google_storage_bucket.uploads.name
}

output "bucket_url" {
  description = "gs:// URL of the uploads bucket."
  value       = google_storage_bucket.uploads.url
}
