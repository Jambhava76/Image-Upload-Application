# Cloud Image Upload & Gallery Platform

A production-style image management app for the Google Cloud Career Launchpad Cloud Engineer Track. It demonstrates private object storage, serverless APIs, Firestore metadata, least-privilege IAM, signed URLs, structured logging, thumbnail generation, and a React gallery UX.

## Architecture

```text
User
  |
React + Vite frontend
  |
HTTPS REST API
  |
Cloud Run backend
  |-- Cloud Storage: uploads/ and thumbnails/
  |-- Firestore: searchable image metadata
  |-- Cloud Logging: structured request and image event logs
```

## Features

- Drag-and-drop upload with local image preview.
- Client and server validation for JPG, PNG, and WEBP files up to 5 MB.
- Byte-level MIME detection to reject renamed executables, PDFs, ZIPs, and other non-images.
- Random object paths using UUIDs to prevent overwrite attacks.
- SHA-256 duplicate detection before writing to Cloud Storage.
- Original and thumbnail objects stored separately under `uploads/` and `thumbnails/`.
- Firestore metadata queries instead of scanning the bucket.
- Search by image name using generated Firestore search tokens.
- Private bucket access through 30-minute signed URLs.
- Delete API removes both Cloud Storage objects and Firestore metadata.
- Structured JSON logs for upload success, duplicate rejection, delete events, request latency, and API errors.
- Dockerfile and Cloud Build deployment for Cloud Run.
- Terraform example for bucket, Firestore, Cloud Run, IAM, and service enablement.

## Project Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- validators/
|   |-- .env.example
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   `-- components/
|   |-- .env.example
|   `-- firebase.json
|-- terraform/
|-- cloudbuild.yaml
|-- Dockerfile
`-- README.md
```

## Backend API

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/upload` or `/api/upload` | Upload, validate, thumbnail, store, and index an image. |
| `GET` | `/images` or `/api/images` | List image metadata with signed image URLs. |
| `GET` | `/images?search=mountain` | Search Firestore metadata by generated name tokens. |
| `GET` | `/image/:id` or `/api/image/:id` | Fetch one image metadata record. |
| `DELETE` | `/image/:id` or `/api/image/:id` | Delete original, thumbnail, and metadata. |
| `GET` | `/health` | Health check endpoint. |

Example upload response:

```json
{
  "id": "7fd6f41f-8dc3-4f46-a0b9-640bb5a01d3c",
  "imageName": "mountain.png",
  "imageURL": "https://storage.googleapis.com/...",
  "thumbnailURL": "https://storage.googleapis.com/...",
  "uploadedBy": "anonymous",
  "uploadedAt": "2026-07-06T08:30:00.000Z",
  "fileSize": 382144,
  "contentType": "image/png"
}
```

## Firestore Metadata

Each image document stores:

```json
{
  "id": "image UUID",
  "imageName": "cat.png",
  "bucket": "project-images-storage",
  "originalObjectPath": "uploads/{id}/cat.png",
  "thumbnailObjectPath": "thumbnails/{id}/cat-thumb.webp",
  "uploadedBy": "user or anonymous",
  "uploadedAt": "ISO timestamp",
  "fileSize": 382144,
  "contentType": "image/png",
  "sha256": "duplicate detection hash",
  "searchText": "cat png",
  "searchTokens": ["cat", "png", "ca", "at"]
}
```

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set `GCS_BUCKET_NAME`, `GOOGLE_CLOUD_PROJECT`, and any CORS values. For local Google credentials, use Application Default Credentials:

   ```bash
   gcloud auth application-default login
   ```

3. Configure the frontend:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

4. Start the API and frontend:

   ```bash
   npm run backend:dev
   npm run frontend:dev
   ```

The frontend defaults to `http://localhost:5173`, and the backend defaults to `http://localhost:8080`.

## Free Local Demo Mode

If you cannot enable Google Cloud billing, the project still runs end-to-end locally with the same REST API and frontend workflow.

The checked-in local development env files use:

```text
STORAGE_DRIVER=local
METADATA_DRIVER=local
LOCAL_DATA_DIR=./.local-data
```

Local mode stores:

- uploaded originals under `backend/.local-data/objects/uploads/`
- generated thumbnails under `backend/.local-data/objects/thumbnails/`
- searchable metadata in `backend/.local-data/metadata.json`

Run the app:

```bash
npm run backend:dev
npm run frontend:dev
```

Then open `http://localhost:5173`.

The app will upload, preview, list, search, and delete images without Google Cloud credentials. To switch back to Google Cloud later, set `STORAGE_DRIVER=gcp`, `METADATA_DRIVER=firestore`, and configure `GOOGLE_CLOUD_PROJECT` plus `GCS_BUCKET_NAME` in `backend/.env`.

## Google Cloud Setup

The fastest Windows setup path is the included PowerShell script:

```powershell
.\scripts\setup-gcp.ps1 -ProjectId YOUR_PROJECT_ID
```

It enables the required services, creates the private Cloud Storage bucket, creates the Cloud Run service account, applies least-privilege IAM, creates the Artifact Registry repository, creates Firestore if needed, and writes `backend/.env` plus `frontend/.env`.

Prerequisites:

- Install the Google Cloud CLI.
- Run `gcloud auth login`.
- Make sure billing is enabled on the Google Cloud project.

The script configures local Application Default Credentials to impersonate the Cloud Run service account, so the local backend can generate signed URLs without a downloaded service account key.

Create or choose a project, then enable:

```bash
gcloud services enable run.googleapis.com storage.googleapis.com firestore.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com
```

Create a private bucket:

```bash
gcloud storage buckets create gs://PROJECT_ID-images-storage --location=US --uniform-bucket-level-access
gcloud storage buckets update gs://PROJECT_ID-images-storage --public-access-prevention
```

Create the Cloud Run service account:

```bash
gcloud iam service-accounts create cloud-run-image-service \
  --display-name="Cloud Run Image Gallery service account"
```

Grant least-privilege roles:

```bash
gcloud storage buckets add-iam-policy-binding gs://PROJECT_ID-images-storage \
  --member="serviceAccount:cloud-run-image-service@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cloud-run-image-service@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud iam service-accounts add-iam-policy-binding \
  cloud-run-image-service@PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:cloud-run-image-service@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

The token creator binding allows the Cloud Run service account to sign Cloud Storage URLs without making the bucket public.

## Deploy Backend to Cloud Run

Build and deploy from the repository root:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_BUCKET=PROJECT_ID-images-storage,_CORS_ORIGIN=https://your-frontend-domain.example
```

Or build manually:

```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/cloud-image-gallery/api:latest

gcloud run deploy cloud-image-gallery-api \
  --image us-central1-docker.pkg.dev/PROJECT_ID/cloud-image-gallery/api:latest \
  --region us-central1 \
  --service-account cloud-run-image-service@PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars GCS_BUCKET_NAME=PROJECT_ID-images-storage,FIRESTORE_COLLECTION=images,CORS_ORIGIN=https://your-frontend-domain.example
```

## Deploy Frontend

Build the React app:

```bash
cd frontend
npm run build
```

The included `frontend/firebase.json` supports Firebase Hosting:

```bash
firebase deploy --only hosting
```

You can also host `frontend/dist` from Cloud Storage static hosting, Firebase Hosting, or Vercel. Set `VITE_API_BASE_URL` to your Cloud Run API base URL before building.

## Terraform

The `terraform/` folder provisions the main cloud resources:

- Required Google Cloud APIs.
- Private Cloud Storage bucket with uniform access, public access prevention, optional versioning, and lifecycle deletion.
- Firestore Native database.
- Least-privilege Cloud Run service account.
- Cloud Run service with autoscaling to zero.
- IAM for Storage, Firestore, and signed URL creation.

Usage:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

If your project already has a Firestore database, set `create_firestore_database = false`.

## Cloud Engineering Concepts Demonstrated

| Concept | Implementation |
| --- | --- |
| Object storage | Private Cloud Storage bucket with `uploads/` and `thumbnails/` prefixes. |
| Serverless compute | Express API container deployed to Cloud Run. |
| REST APIs | Upload, list, fetch, search, delete, and health endpoints. |
| IAM | Custom Cloud Run service account with bucket-level object admin and Firestore user permissions. |
| Secure access | Signed URLs with 30-minute expiry; no public bucket access. |
| Metadata management | Firestore image documents and search tokens. |
| File handling | Multipart uploads, byte-level validation, UUID object paths, and size limits. |
| Duplicate protection | SHA-256 hash lookup before upload. |
| Performance | Thumbnail generation reduces gallery bandwidth. |
| Logging and monitoring | Structured logs flow into Cloud Logging and Cloud Monitoring. |
| Scalability | Cloud Run autoscaling and durable Cloud Storage for binary data. |

## Suggested Enhancements

- Add Firebase Authentication or Identity-Aware Proxy and replace `anonymous` uploads with verified identities.
- Add Cloud Vision API labels to `searchTokens` for AI-powered discovery.
- Add Cloud CDN in front of signed URL delivery for high-traffic workloads.
- Add a Cloud Run Job or Eventarc-triggered Cloud Function for asynchronous thumbnail generation.
- Add a ClamAV scanning service before persisting untrusted files.
