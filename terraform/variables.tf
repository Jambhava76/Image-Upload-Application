variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Cloud Run region."
  type        = string
  default     = "us-central1"
}

variable "bucket_location" {
  description = "Cloud Storage bucket location."
  type        = string
  default     = "US"
}

variable "bucket_name" {
  description = "Globally unique private image bucket name."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
  default     = "cloud-image-gallery-api"
}

variable "container_image" {
  description = "Container image URI deployed to Cloud Run."
  type        = string
}

variable "frontend_origin" {
  description = "Allowed CORS origin for the deployed frontend."
  type        = string
}

variable "firestore_location" {
  description = "Firestore database location. Only used when create_firestore_database is true."
  type        = string
  default     = "nam5"
}

variable "create_firestore_database" {
  description = "Set false if the project already has a Firestore Native database."
  type        = bool
  default     = true
}

variable "allow_unauthenticated" {
  description = "Allow public invocation of the Cloud Run API. Set false when placing the API behind auth."
  type        = bool
  default     = true
}

variable "enable_bucket_versioning" {
  description = "Enable object versioning for recovery."
  type        = bool
  default     = true
}

variable "lifecycle_delete_after_days" {
  description = "Delete objects older than this many days. Use 0 to disable."
  type        = number
  default     = 90
}
