import { db } from '../config/db.js';

export async function getProfile(req, res) {
  const { rows } = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.user_id]
  );
  res.json(rows[0] || null);
}

export async function updateProfile(req, res) {
  const { name } = req.body;
  const { rows } = await db.query(
    'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
    [name, req.user.user_id]
  );
  res.json(rows[0]);
}
