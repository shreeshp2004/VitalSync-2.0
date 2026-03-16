import { db }    from '../config/db.js';
import { redis } from '../config/redis.js';

export async function getLatest(req, res) {
  const { user_id } = req.user;

  // Try Redis first (< 1ms)
  const cached = await redis.get(`latest:${user_id}`);
  if (cached) return res.json(JSON.parse(cached));

  // Fall back to DB
  const { rows } = await db.query(
    'SELECT * FROM vitals WHERE user_id = $1 ORDER BY time DESC LIMIT 1', [user_id]
  );
  res.json(rows[0] || null);
}

export async function getHistory(req, res) {
  const { user_id } = req.user;
  const { range = '24h', interval = '5 minutes' } = req.query;

  const rangeMap = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', '3m': '90 days' };
  const since    = rangeMap[range] || '24 hours';

  const { rows } = await db.query(`
    SELECT
      time_bucket($1::interval, time) AS bucket,
      AVG(hr)::int          AS avg_hr,
      MAX(hr)::int          AS max_hr,
      MIN(hr)::int          AS min_hr,
      ROUND(AVG(spo2)::numeric, 1)      AS avg_spo2,
      ROUND(AVG(hrv_rmssd)::numeric, 1) AS avg_hrv,
      ROUND(AVG(temp)::numeric, 1)      AS avg_temp,
      ROUND(AVG(humidity)::numeric, 1)  AS avg_humidity
    FROM vitals
    WHERE user_id = $2 AND time > NOW() - $3::interval
    GROUP BY bucket
    ORDER BY bucket ASC
  `, [interval, user_id, since]);

  res.json(rows);
}

export async function getSession(req, res) {
  const { user_id } = req.user;
  const { limit = 20, page = 1 } = req.query;
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    'SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3',
    [user_id, limit, offset]
  );
  const count = await db.query('SELECT COUNT(*) FROM sessions WHERE user_id = $1', [user_id]);

  res.json({ sessions: rows, total: parseInt(count.rows[0].count), page: parseInt(page) });
}
