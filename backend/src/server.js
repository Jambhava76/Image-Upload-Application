import { env, assertCloudConfiguration } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

assertCloudConfiguration();

const app = createApp();

app.listen(env.port, () => {
  logger.info('api.started', {
    port: env.port,
    nodeEnv: env.nodeEnv
  });
});
