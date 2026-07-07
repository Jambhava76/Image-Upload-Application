import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { EXTENSION_BY_MIME } from '../validators/image.validator.js';
import { buildSearchText, generateSearchTokens } from '../utils/searchTokens.js';

const sanitizeBaseName = (fileName) => {
  const parsed = path.parse(fileName || 'image');
  const safeName = parsed.name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return safeName || 'image';
};

export const calculateSha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

export const createImageRecord = ({ originalName, contentType, size, uploadedBy, sha256 }) => {
  const id = crypto.randomUUID();
  const extension = EXTENSION_BY_MIME[contentType] || 'jpg';
  const safeName = sanitizeBaseName(originalName);
  const originalObjectPath = `uploads/${id}/${safeName}.${extension}`;
  const thumbnailObjectPath = `thumbnails/${id}/${safeName}-thumb.webp`;
  const uploadedAt = new Date().toISOString();

  return {
    id,
    imageName: originalName,
    bucket: env.gcsBucketName,
    originalObjectPath,
    thumbnailObjectPath,
    uploadedBy,
    uploadedAt,
    fileSize: size,
    contentType,
    thumbnailContentType: 'image/webp',
    sha256,
    searchText: buildSearchText(originalName),
    searchTokens: generateSearchTokens(originalName)
  };
};

export const createThumbnail = async (buffer) =>
  sharp(buffer)
    .rotate()
    .resize({
      width: env.thumbnailWidth,
      height: env.thumbnailHeight,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 82 })
    .toBuffer();

export const toImageResponse = (image, urls = {}) => ({
  id: image.id,
  imageName: image.imageName,
  imageURL: urls.imageURL,
  thumbnailURL: urls.thumbnailURL,
  uploadedBy: image.uploadedBy,
  uploadedAt: image.uploadedAt,
  fileSize: image.fileSize,
  contentType: image.contentType
});
