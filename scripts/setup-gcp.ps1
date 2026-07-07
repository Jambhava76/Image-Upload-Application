param(
  [Parameter(Mandatory = $true)]
  [string] $ProjectId,

  [string] $Region = "us-central1",
  [string] $BucketLocation = "US",
  [string] $FirestoreLocation = "nam5",
  [string] $BucketName = "",
  [string] $FrontendOrigin = "http://localhost:5173",
  [switch] $SkipFirestoreCreate
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string] $Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Gcloud {
  $command = Get-Command gcloud -ErrorAction SilentlyContinue

  if (-not $command) {
    throw @"
Google Cloud CLI was not found.

Install it first:
https://cloud.google.com/sdk/docs/install

After installing, restart this terminal and run:
gcloud auth login
gcloud auth application-default login
.\scripts\setup-gcp.ps1 -ProjectId $ProjectId
"@
  }
}

function Invoke-Gcloud {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
  )

  & gcloud @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "gcloud command failed: gcloud $($Arguments -join ' ')"
  }
}

function Get-PrincipalMember {
  param([string] $Account)

  if ($Account.EndsWith(".gserviceaccount.com")) {
    return "serviceAccount:$Account"
  }

  return "user:$Account"
}

function Test-GcloudCommand {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
  )

  & gcloud @Arguments *> $null
  return $LASTEXITCODE -eq 0
}

function Wait-ForService {
  param(
    [string] $ServiceName,
    [string] $ProjectId,
    [int] $TimeoutSeconds = 180
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $enabled = & gcloud services list `
      --enabled `
      --project $ProjectId `
      --filter="config.name=$ServiceName" `
      --format="value(config.name)"

    if ($enabled -eq $ServiceName) {
      Write-Host "Enabled: $ServiceName"
      return
    }

    Write-Host "Waiting for API to enable: $ServiceName"
    Start-Sleep -Seconds 10
  }

  throw "Timed out waiting for API to enable: $ServiceName"
}

Require-Gcloud

if (-not $BucketName) {
  $BucketName = "$ProjectId-images-storage"
}

$serviceAccountName = "cloud-run-image-service"
$serviceAccountEmail = "$serviceAccountName@$ProjectId.iam.gserviceaccount.com"
$artifactRepo = "cloud-image-gallery"
$backendEnvPath = Join-Path $PSScriptRoot "..\backend\.env"
$frontendEnvPath = Join-Path $PSScriptRoot "..\frontend\.env"

Write-Step "Setting active project"
Invoke-Gcloud config set project $ProjectId

Write-Step "Checking Google Cloud authentication"
$activeAccount = (& gcloud auth list --filter=status:ACTIVE --format="value(account)") | Select-Object -First 1

if (-not $activeAccount) {
  Write-Host "No active Google Cloud account found. Opening login flow..."
  Invoke-Gcloud auth login
  $activeAccount = (& gcloud auth list --filter=status:ACTIVE --format="value(account)") | Select-Object -First 1
}

Write-Step "Enabling required Google Cloud services"
$services = @(
  "artifactregistry.googleapis.com",
  "cloudbuild.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "firestore.googleapis.com",
  "iam.googleapis.com",
  "iamcredentials.googleapis.com",
  "logging.googleapis.com",
  "run.googleapis.com",
  "storage.googleapis.com"
)

Invoke-Gcloud services enable @services --project $ProjectId

foreach ($service in $services) {
  Wait-ForService -ServiceName $service -ProjectId $ProjectId
}

Write-Step "Creating Artifact Registry repository if needed"
if (-not (Test-GcloudCommand artifacts repositories describe $artifactRepo --location $Region --project $ProjectId)) {
  Invoke-Gcloud artifacts repositories create $artifactRepo `
    --repository-format=docker `
    --location $Region `
    --description="Cloud Image Gallery container images" `
    --project $ProjectId
} else {
  Write-Host "Artifact Registry repository already exists: $artifactRepo"
}

Write-Step "Creating private Cloud Storage bucket if needed"
if (-not (Test-GcloudCommand storage buckets describe "gs://$BucketName" --project $ProjectId)) {
  Invoke-Gcloud storage buckets create "gs://$BucketName" `
    --project $ProjectId `
    --location $BucketLocation `
    --uniform-bucket-level-access
} else {
  Write-Host "Bucket already exists: gs://$BucketName"
}

Invoke-Gcloud storage buckets update "gs://$BucketName" `
  --project $ProjectId `
  --uniform-bucket-level-access `
  --public-access-prevention `
  --versioning

Write-Step "Creating Firestore Native database if needed"
if (-not $SkipFirestoreCreate) {
  if (-not (Test-GcloudCommand firestore databases describe --database="(default)" --project $ProjectId)) {
    Invoke-Gcloud firestore databases create `
      --database="(default)" `
      --location=$FirestoreLocation `
      --type=firestore-native `
      --project $ProjectId
  } else {
    Write-Host "Firestore default database already exists."
  }
} else {
  Write-Host "Skipping Firestore database creation."
}

Write-Step "Creating Cloud Run service account if needed"
if (-not (Test-GcloudCommand iam service-accounts describe $serviceAccountEmail --project $ProjectId)) {
  Invoke-Gcloud iam service-accounts create $serviceAccountName `
    --display-name="Cloud Run Image Gallery service account" `
    --project $ProjectId
} else {
  Write-Host "Service account already exists: $serviceAccountEmail"
}

Write-Step "Applying least-privilege IAM bindings"
Invoke-Gcloud storage buckets add-iam-policy-binding "gs://$BucketName" `
  --member="serviceAccount:$serviceAccountEmail" `
  --role="roles/storage.objectAdmin" `
  --project $ProjectId

Invoke-Gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$serviceAccountEmail" `
  --role="roles/datastore.user" `
  --condition=None

Invoke-Gcloud iam service-accounts add-iam-policy-binding $serviceAccountEmail `
  --member="serviceAccount:$serviceAccountEmail" `
  --role="roles/iam.serviceAccountTokenCreator" `
  --project $ProjectId

Invoke-Gcloud iam service-accounts add-iam-policy-binding $serviceAccountEmail `
  --member=(Get-PrincipalMember $activeAccount) `
  --role="roles/iam.serviceAccountTokenCreator" `
  --project $ProjectId

Write-Step "Configuring local Application Default Credentials"
Write-Host "The local backend will impersonate $serviceAccountEmail for Cloud Storage, Firestore, and signed URLs."
Invoke-Gcloud auth application-default login --impersonate-service-account=$serviceAccountEmail

Write-Step "Writing local environment files"
@"
PORT=8080
NODE_ENV=development
GOOGLE_CLOUD_PROJECT=$ProjectId
GCS_BUCKET_NAME=$BucketName
FIRESTORE_COLLECTION=images
CORS_ORIGIN=$FrontendOrigin
SIGNED_URL_TTL_MINUTES=30
MAX_FILE_SIZE_MB=5
THUMBNAIL_WIDTH=480
THUMBNAIL_HEIGHT=480
"@ | Set-Content -Path $backendEnvPath -Encoding utf8

@"
VITE_API_BASE_URL=http://localhost:8080/api
"@ | Set-Content -Path $frontendEnvPath -Encoding utf8

Write-Step "Google Cloud setup complete"
Write-Host "Project: $ProjectId"
Write-Host "Bucket: gs://$BucketName"
Write-Host "Service account: $serviceAccountEmail"
Write-Host "Artifact Registry repo: $Region-docker.pkg.dev/$ProjectId/$artifactRepo"
Write-Host ""
Write-Host "Next local commands:"
Write-Host "  npm run backend:dev"
Write-Host "  npm run frontend:dev"
Write-Host ""
Write-Host "Backend deploy image path:"
Write-Host "  $Region-docker.pkg.dev/$ProjectId/$artifactRepo/api:latest"
