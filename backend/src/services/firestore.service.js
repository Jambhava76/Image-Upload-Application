import fs from 'node:fs/promises';
import path from 'node:path';
import { Firestore } from '@google-cloud/firestore';
import { env } from '../config/env.js';
import { normalizeSearchTerms, primarySearchToken } from '../utils/searchTokens.js';

let firestore;

const getFirestore = () => {
  if (!firestore) {
    firestore = new Firestore({
      projectId: env.googleCloudProject || undefined,
      ignoreUndefinedProperties: true
    });
  }

  return firestore;
};

const collection = () => getFirestore().collection(env.firestoreCollection);

const metadataPath = () => path.resolve(env.localDataDir, 'metadata.json');

const fromDoc = (doc) => ({
  id: doc.id,
  ...doc.data()
});

const readLocalImages = async () => {
  try {
    const raw = await fs.readFile(metadataPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.images) ? parsed.images : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

const writeLocalImages = async (images) => {
  const filePath = metadataPath();

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ images }, null, 2));
};

export const createImageMetadata = async (metadata) => {
  if (env.metadataDriver === 'local') {
    const images = await readLocalImages();
    const nextImages = [metadata, ...images.filter((image) => image.id !== metadata.id)];

    await writeLocalImages(nextImages);
    return metadata;
  }

  await collection().doc(metadata.id).set(metadata);
  return metadata;
};

export const getImageMetadata = async (imageId) => {
  if (env.metadataDriver === 'local') {
    const images = await readLocalImages();
    return images.find((image) => image.id === imageId) || null;
  }

  const doc = await collection().doc(imageId).get();
  return doc.exists ? fromDoc(doc) : null;
};

export const findImageByHash = async (sha256) => {
  if (env.metadataDriver === 'local') {
    const images = await readLocalImages();
    return images.find((image) => image.sha256 === sha256) || null;
  }

  const snapshot = await collection().where('sha256', '==', sha256).limit(1).get();
  return snapshot.empty ? null : fromDoc(snapshot.docs[0]);
};

export const listImageMetadata = async ({ search = '', limit = 60 } = {}) => {
  const boundedLimit = Math.min(Math.max(Number(limit) || 60, 1), 100);
  const searchTerms = normalizeSearchTerms(search);

  if (env.metadataDriver === 'local') {
    const images = await readLocalImages();
    const filteredImages =
      searchTerms.length > 0
        ? images.filter((image) => searchTerms.every((term) => image.searchText?.includes(term)))
        : images;

    return filteredImages
      .sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt))
      .slice(0, boundedLimit);
  }

  if (searchTerms.length > 0) {
    const snapshot = await collection()
      .where('searchTokens', 'array-contains', primarySearchToken(search))
      .limit(boundedLimit)
      .get();

    return snapshot.docs
      .map(fromDoc)
      .filter((image) => searchTerms.every((term) => image.searchText?.includes(term)))
      .sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt));
  }

  const snapshot = await collection().orderBy('uploadedAt', 'desc').limit(boundedLimit).get();
  return snapshot.docs.map(fromDoc);
};

export const deleteImageMetadata = async (imageId) => {
  if (env.metadataDriver === 'local') {
    const images = await readLocalImages();
    await writeLocalImages(images.filter((image) => image.id !== imageId));
    return;
  }

  await collection().doc(imageId).delete();
};
