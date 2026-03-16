import { db }   from '../config/db.js';
import { randomBytes } from 'crypto';

export async function listDevices(req, res) {
  const { rows } = await db.query(
    'SELECT id, name, mac_address, firmware_ver, last_seen, is_active FROM devices WHERE user_id = $1',
    [req.user.user_id]
  );
  res.json(rows);
}

export async function registerDevice(req, res) {
  const { name, mac_address, firmware_ver } = req.body;
  const device_token = randomBytes(32).toString('hex');

  const { rows } = await db.query(
    `INSERT INTO devices (user_id, device_token, name, mac_address, firmware_ver)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, device_token, created_at`,
    [req.user.user_id, device_token, name || 'VitalSync v1', mac_address, firmware_ver]
  );
  res.status(201).json(rows[0]);
}

export async function deactivateDevice(req, res) {
  await db.query(
    'UPDATE devices SET is_active = false WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.user_id]
  );
  res.json({ ok: true });
}
