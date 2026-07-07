const write = (severity, message, payload = {}) => {
  const entry = {
    severity,
    message,
    service: 'cloud-image-gallery-api',
    ...payload,
    timestamp: new Date().toISOString()
  };

  const line = JSON.stringify(entry);

  if (severity === 'ERROR') {
    console.error(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (message, payload) => write('INFO', message, payload),
  warn: (message, payload) => write('WARNING', message, payload),
  error: (message, payload) => write('ERROR', message, payload)
};
