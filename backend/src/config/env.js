import dotenv from 'dotenv';

dotenv.config();

const numberFromEnv = (name, fallback) => {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
};

const listFromEnv = (name, fallback) => {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const env = {
  port: numberFromEnv('PORT', 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  metadataDriver: process.env.METADATA_DRIVER || process.env.STORAGE_DRIVER || 'local',
  localDataDir: process.env.LOCAL_DATA_DIR || './.local-data',
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL || 'http://localhost:8080/api',
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
  gcsBucketName: process.env.GCS_BUCKET_NAME,
  firestoreCollection: process.env.FIRESTORE_COLLECTION || 'images',
  corsOrigin: listFromEnv('CORS_ORIGIN', ['http://localhost:5173']),
  signedUrlTtlMinutes: numberFromEnv('SIGNED_URL_TTL_MINUTES', 30),
  maxFileSizeMb: numberFromEnv('MAX_FILE_SIZE_MB', 5),
  thumbnailWidth: numberFromEnv('THUMBNAIL_WIDTH', 480),
  thumbnailHeight: numberFromEnv('THUMBNAIL_HEIGHT', 480)
};

export const assertCloudConfiguration = () => {
  const missing = [];

  if (!['local', 'gcp'].includes(env.storageDriver)) {
    throw new Error('STORAGE_DRIVER must be either "local" or "gcp".');
  }

  if (!['local', 'firestore'].includes(env.metadataDriver)) {
    throw new Error('METADATA_DRIVER must be either "local" or "firestore".');
  }

  if (env.storageDriver === 'gcp' && !env.gcsBucketName) {
    missing.push('GCS_BUCKET_NAME');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required cloud configuration: ${missing.join(', ')}`);
  }
};

export const maxFileSizeBytes = env.maxFileSizeMb * 1024 * 1024;
