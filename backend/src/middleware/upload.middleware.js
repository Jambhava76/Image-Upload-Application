import multer from 'multer';
import { maxFileSizeBytes } from '../config/env.js';
import { ALLOWED_IMAGE_TYPES } from '../validators/image.validator.js';
import { badRequest } from '../utils/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(badRequest('Only JPG, PNG, and WEBP images are allowed.'));
      return;
    }

    callback(null, true);
  }
});

export const imageUpload = upload.single('image');
