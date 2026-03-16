import { db } from '../config/db.js';

export async function getAlerts(req, res) {
  const { user_id } = req.user;
  const { unread_only, limit = 50 } = req.query;
  const filter = unread_only === 'true' ? 'AND is_read = false' : '';

  const { rows } = await db.query(
    `SELECT * FROM alerts WHERE user_id = $1 ${filter} ORDER BY triggered_at DESC LIMIT $2`,
    [user_id, limit]
  );
  res.json(rows);
}

export async function markRead(req, res) {
  const { user_id } = req.user;
  const { id } = req.params;
  await db.query(
    'UPDATE alerts SET is_read = true WHERE id = $1 AND user_id = $2',
    [id, user_id]
  );
  res.json({ ok: true });
}
