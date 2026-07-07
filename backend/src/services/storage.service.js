import fs from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { env } from '../config/env.js';

let storage;

const getStorage = () => {
  if (!storage) {
    storage = new Storage({
      projectId: env.googleCloudProject || undefined
    });
  }

  return storage;
};

const bucket = () => getStorage().bucket(env.gcsBucketName);

const localRoot = () => path.resolve(env.localDataDir, 'objects');

const safeLocalPath = (objectPath) => {
  const root = localRoot();
  const target = path.resolve(root, objectPath);

  if (!target.startsWith(root)) {
    throw new Error('Invalid object path.');
  }

  return target;
};

const encodeObjectPath = (objectPath) => objectPath.split('/').map(encodeURIComponent).join('/');

export const uploadBuffer = async ({ objectPath, buffer, contentType, metadata = {} }) => {
  if (env.storageDriver === 'local') {
    const target = safeLocalPath(objectPath);

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);

    return {
      bucket: 'local-development',
      objectPath,
      contentType,
      metadata
    };
  }

  const file = bucket().file(objectPath);

  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: 'private, max-age=3600',
      metadata
    }
  });

  return {
    bucket: env.gcsBucketName,
    objectPath
  };
};

export const getSignedReadUrl = async (objectPath) => {
  if (env.storageDriver === 'local') {
    const expires = Date.now() + env.signedUrlTtlMinutes * 60 * 1000;
    return `${env.publicApiBaseUrl}/files/${encodeObjectPath(objectPath)}?expires=${expires}`;
  }

  const [url] = await bucket().file(objectPath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + env.signedUrlTtlMinutes * 60 * 1000
  });

  return url;
};

export const deleteObject = async (objectPath) => {
  if (env.storageDriver === 'local') {
    try {
      await fs.unlink(safeLocalPath(objectPath));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return;
      }

      throw error;
    }

    return;
  }

  try {
    await bucket().file(objectPath).delete();
  } catch (error) {
    if (error.code === 404) {
      return;
    }

    throw error;
  }
};

export const getLocalObjectFilePath = (objectPath) => {
  if (env.storageDriver !== 'local') {
    return null;
  }

  return safeLocalPath(objectPath);
};
