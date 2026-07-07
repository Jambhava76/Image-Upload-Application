import {
  createImageMetadata,
  deleteImageMetadata,
  findImageByHash,
  getImageMetadata,
  listImageMetadata
} from '../services/firestore.service.js';
import { deleteObject, getLocalObjectFilePath, getSignedReadUrl, uploadBuffer } from '../services/storage.service.js';
import { calculateSha256, createImageRecord, createThumbnail, toImageResponse } from '../services/image.service.js';
import { validateUploadedImage } from '../validators/image.validator.js';
import { conflict, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const uploaderFromRequest = (req) =>
  req.get('x-goog-authenticated-user-email') || req.get('x-user-id') || 'anonymous';

const addSignedUrls = async (image) => {
  const [imageURL, thumbnailURL] = await Promise.all([
    getSignedReadUrl(image.originalObjectPath),
    getSignedReadUrl(image.thumbnailObjectPath)
  ]);

  return toImageResponse(image, { imageURL, thumbnailURL });
};

export const uploadImage = async (req, res) => {
  const file = req.file;
  const { contentType } = await validateUploadedImage(file);
  const sha256 = calculateSha256(file.buffer);
  const duplicate = await findImageByHash(sha256);

  if (duplicate) {
    logger.warn('image.duplicate_rejected', {
      requestId: req.id,
      duplicateId: duplicate.id,
      imageName: file.originalname
    });

    throw conflict('This image already exists in the gallery.', {
      duplicateId: duplicate.id,
      imageName: duplicate.imageName
    });
  }

  const image = createImageRecord({
    originalName: file.originalname,
    contentType,
    size: file.size,
    uploadedBy: uploaderFromRequest(req),
    sha256
  });
  const thumbnail = await createThumbnail(file.buffer);

  await Promise.all([
    uploadBuffer({
      objectPath: image.originalObjectPath,
      buffer: file.buffer,
      contentType,
      metadata: {
        imageId: image.id,
        imageName: image.imageName,
        sha256
      }
    }),
    uploadBuffer({
      objectPath: image.thumbnailObjectPath,
      buffer: thumbnail,
      contentType: image.thumbnailContentType,
      metadata: {
        imageId: image.id,
        sourceObject: image.originalObjectPath
      }
    })
  ]);

  await createImageMetadata(image);
  const response = await addSignedUrls(image);

  logger.info('image.uploaded', {
    requestId: req.id,
    imageId: image.id,
    imageName: image.imageName,
    fileSize: image.fileSize,
    contentType: image.contentType
  });

  res.status(201).json(response);
};

export const listImages = async (req, res) => {
  const images = await listImageMetadata({
    search: req.query.search || req.query.q || '',
    limit: req.query.limit
  });
  const response = await Promise.all(images.map(addSignedUrls));

  res.json(response);
};

export const getImage = async (req, res) => {
  const image = await getImageMetadata(req.params.id);

  if (!image) {
    throw notFound('Image metadata was not found.');
  }

  res.json(await addSignedUrls(image));
};

export const deleteImage = async (req, res) => {
  const image = await getImageMetadata(req.params.id);

  if (!image) {
    throw notFound('Image metadata was not found.');
  }

  await Promise.all([deleteObject(image.originalObjectPath), deleteObject(image.thumbnailObjectPath)]);
  await deleteImageMetadata(image.id);

  logger.info('image.deleted', {
    requestId: req.id,
    imageId: image.id,
    imageName: image.imageName
  });

  res.json({
    message: 'Image deleted successfully',
    id: image.id
  });
};

export const serveLocalFile = async (req, res) => {
  const objectPath = req.params[0];
  const filePath = getLocalObjectFilePath(objectPath);

  if (!filePath) {
    throw notFound('Local file serving is available only when STORAGE_DRIVER=local.');
  }

  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
      res.status(error.statusCode || 404).json({
        error: 'Image file was not found.'
      });
    }
  });
};
