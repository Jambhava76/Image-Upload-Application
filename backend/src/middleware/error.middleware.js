import multer from 'multer';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
};

export const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || (error instanceof multer.MulterError ? 400 : 500);
  const message =
    error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
      ? 'Image exceeds the configured file size limit.'
      : error.message || 'Unexpected server error';

  logger.error('api.error', {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    requestId: req.id,
    error: {
      name: error.name,
      message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }
  });

  res.status(statusCode).json({
    error: message,
    details: error.details
  });
};
