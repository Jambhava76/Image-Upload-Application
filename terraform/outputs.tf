output "bucket_name" {
  description = "Private Cloud Storage bucket used for originals and thumbnails."
  value       = google_storage_bucket.images.name
}

output "cloud_run_service_account" {
  description = "Least-privilege service account used by Cloud Run."
  value       = google_service_account.cloud_run.email
}

output "cloud_run_url" {
  description = "Cloud Run API URL."
  value       = google_cloud_run_v2_service.api.uri
}
