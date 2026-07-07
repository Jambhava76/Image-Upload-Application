import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { imageRoutes } from './routes/images.routes.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id']
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cloud-image-gallery-api'
    });
  });

  app.use('/', imageRoutes);
  app.use('/api', imageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
