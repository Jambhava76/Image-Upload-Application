import { fileTypeFromBuffer } from 'file-type';
import { badRequest } from '../utils/errors.js';
import { maxFileSizeBytes } from '../config/env.js';

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export const validateUploadedImage = async (file) => {
  if (!file) {
    throw badRequest('No image file was provided. Attach the file in the "image" form field.');
  }

  if (file.size > maxFileSizeBytes) {
    throw badRequest(`Image exceeds the ${Math.round(maxFileSizeBytes / 1024 / 1024)} MB limit.`);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw badRequest('Only JPG, PNG, and WEBP images are allowed.');
  }

  const detected = await fileTypeFromBuffer(file.buffer);

  if (!detected || !ALLOWED_IMAGE_TYPES.has(detected.mime)) {
    throw badRequest('The uploaded file content is not a supported image type.');
  }

  return {
    contentType: detected.mime,
    extension: EXTENSION_BY_MIME[detected.mime]
  };
};
