import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  req.id = req.get('x-cloud-trace-context') || randomUUID();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    logger.info('http.request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      userAgent: req.get('user-agent')
    });
  });

  next();
};
