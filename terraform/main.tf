provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  cloud_run_member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com"
  ])

  service            = each.key
  disable_on_destroy = false
}

resource "google_firestore_database" "default" {
  count       = var.create_firestore_database ? 1 : 0
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket" "images" {
  name                        = var.bucket_name
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = var.enable_bucket_versioning
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_delete_after_days > 0 ? [1] : []

    content {
      action {
        type = "Delete"
      }

      condition {
        age = var.lifecycle_delete_after_days
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "cloud_run" {
  account_id   = "cloud-run-image-service"
  display_name = "Cloud Run Image Gallery service account"

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "object_admin" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectAdmin"
  member = local.cloud_run_member
}

resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = local.cloud_run_member
}

resource "google_service_account_iam_member" "signed_url_creator" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = local.cloud_run_member
}

resource "google_cloud_run_v2_service" "api" {
  name     = var.service_name
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.images.name
      }

      env {
        name  = "FIRESTORE_COLLECTION"
        value = "images"
      }

      env {
        name  = "CORS_ORIGIN"
        value = var.frontend_origin
      }

      env {
        name  = "SIGNED_URL_TTL_MINUTES"
        value = "30"
      }

      env {
        name  = "MAX_FILE_SIZE_MB"
        value = "5"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.required,
    google_storage_bucket_iam_member.object_admin,
    google_project_iam_member.firestore_user,
    google_service_account_iam_member.signed_url_creator
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
