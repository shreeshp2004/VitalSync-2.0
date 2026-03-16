import { db } from '../config/db.js';

export async function getSummary(req, res) {
  const { user_id } = req.user;
  const { range = '24h' } = req.query;
  const rangeMap = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', '3m': '90 days' };
  const since  = rangeMap[range] || '24 hours';

  const { rows } = await db.query(`
    SELECT
      COUNT(*)                              AS data_points,
      ROUND(AVG(hr)::numeric)::int         AS avg_hr,
      MAX(hr)::int                          AS max_hr,
      MIN(hr)::int                          AS min_hr,
      ROUND(AVG(spo2)::numeric, 1)         AS avg_spo2,
      ROUND(AVG(hrv_rmssd)::numeric, 1)    AS avg_hrv,
      ROUND(AVG(temp)::numeric, 1)         AS avg_temp,
      ROUND(AVG(humidity)::numeric, 1)     AS avg_humidity
    FROM vitals
    WHERE user_id = $1 AND time > NOW() - $2::interval
  `, [user_id, since]);

  res.json(rows[0]);
}

export async function getTrends(req, res) {
  const { user_id } = req.user;
  const { range = '7d' } = req.query;
  const rangeMap = { '7d': '7 days', '30d': '30 days', '3m': '90 days' };
  const since  = rangeMap[range] || '7 days';
  const bucket = range === '3m' ? '1 day' : '1 hour';

  const { rows } = await db.query(`
    SELECT
      time_bucket($1::interval, time) AS bucket,
      ROUND(AVG(hr)::numeric)::int   AS avg_hr,
      ROUND(AVG(hrv_rmssd)::numeric,1) AS avg_hrv,
      ROUND(AVG(spo2)::numeric, 1)   AS avg_spo2,
      ROUND(AVG(temp)::numeric, 1)   AS avg_temp
    FROM vitals
    WHERE user_id = $2 AND time > NOW() - $3::interval
    GROUP BY bucket ORDER BY bucket ASC
  `, [bucket, user_id, since]);

  res.json(rows);
}

export async function getReport(req, res) {
  // Stub — full PDF generation handled by reportService job
  res.json({ message: 'Report generation queued. You will receive an email when ready.' });
}

export async function getAlerts(req, res) {}
export async function markRead(req, res) {}
