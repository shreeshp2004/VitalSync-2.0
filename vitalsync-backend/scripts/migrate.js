#!/usr/bin/env node
/**
 * VitalSync — Database Migration Runner
 * Reads all .sql files in src/db/migrations/ in order and executes them.
 * Run: node scripts/migrate.js
 */
import 'dotenv/config';
import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../src/db/migrations');

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  console.log('📦 VitalSync Migration Runner');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.split('@')[1] || 'not set'}`);

  // Ensure migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get applied migrations
  const { rows: applied } = await pool.query('SELECT filename FROM _migrations ORDER BY id');
  const appliedSet = new Set(applied.map(r => r.filename));

  // Get all SQL files, sorted alphabetically
  const files = (await readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  ⚡ Running ${file}…`);

    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`  ✅ ${file} done`);
      ran++;
    } catch (err) {
      console.error(`  ❌ ${file} failed:`, err.message);
      // Continue — some TimescaleDB features fail on plain PostgreSQL
    }
  }

  await pool.end();
  console.log(`\n✅ Migration complete — ${ran} new file(s) applied`);
}

migrate().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
