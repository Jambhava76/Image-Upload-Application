import { Router } from 'express';
import { deleteImage, getImage, listImages, serveLocalFile, uploadImage } from '../controllers/images.controller.js';
import { imageUpload } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const imageRoutes = Router();

imageRoutes.post('/upload', imageUpload, asyncHandler(uploadImage));
imageRoutes.get('/images', asyncHandler(listImages));
imageRoutes.get('/files/*', asyncHandler(serveLocalFile));
imageRoutes.get('/image/:id', asyncHandler(getImage));
imageRoutes.delete('/image/:id', asyncHandler(deleteImage));
