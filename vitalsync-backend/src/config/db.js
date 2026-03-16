import pg from 'pg';
import logger from '../utils/logger.js';

const { Pool } = pg;

let pool;

export async function connectDB() {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('✅ TimescaleDB connected');
  } catch (err) {
    logger.error({ err }, '❌ TimescaleDB connection failed');
    process.exit(1);
  }
}

export const db = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  end: () => pool.end()
};
