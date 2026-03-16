import { createClient } from 'redis';
import logger from '../utils/logger.js';

let client = null;
let isConnected = false;

export async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url || url.includes('localhost')) {
    // Try connecting with a short timeout — don't block startup
    client = createClient({ url: url || 'redis://localhost:6379', socket: { connectTimeout: 3000 } });
  } else {
    client = createClient({ url });
  }

  client.on('error', () => {}); // Suppress noisy error logs during startup

  await Promise.race([
    client.connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
  ]);

  isConnected = true;
  logger.info('✅ Redis connected at ' + (url || 'localhost:6379'));
}

export const redis = new Proxy({}, {
  get(_, prop) {
    if (!isConnected || !client) {
      // Return a no-op function for all Redis calls when not connected
      return async () => null;
    }
    return client[prop]?.bind(client);
  }
});
