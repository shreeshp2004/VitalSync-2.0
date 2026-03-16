import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Unknown error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}
