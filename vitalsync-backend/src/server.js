import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './socket.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;

async function start() {
  // ── Database (required) ────────────────────────────────────────
  await connectDB();

  // ── Redis (optional — skip if not configured or unavailable) ──
  try {
    await connectRedis();
    logger.info('✅ Redis connected');
  } catch (err) {
    logger.warn('⚠️  Redis unavailable — running without cache/pub-sub');
    logger.warn('   Set REDIS_URL in .env or get a free Upstash Redis at https://upstash.com');
  }

  // ── HTTP + Socket.io ───────────────────────────────────────────
  const httpServer = createServer(app);
  initSocket(httpServer);

  // ── AI Agents (skip if Redis not connected) ───────────────────
  try {
    const { agentRunner } = await import('./agents/agentRunner.js');
    await agentRunner.start();
    logger.info('✅ AI Agents started');
  } catch (err) {
    logger.warn('⚠️  AI Agents disabled (requires Redis):', err.message);
  }

  httpServer.listen(PORT, () => {
    logger.info(`\n🚀 VitalSync API running on http://localhost:${PORT}`);
    logger.info(`   Environment : ${process.env.NODE_ENV}`);
    logger.info(`   Frontend URL: ${process.env.FRONTEND_URL}`);
    logger.info(`   ML Service  : ${process.env.ML_SERVICE_URL}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Startup failed — check DATABASE_URL in .env');
  process.exit(1);
});
