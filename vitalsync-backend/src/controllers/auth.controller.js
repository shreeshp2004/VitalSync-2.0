import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
    [name, email, hash, role || 'athlete']
  );
  const user = rows[0];
  const accessToken  = signAccessToken({ user_id: user.id, role: user.role });
  const refreshToken = signRefreshToken({ user_id: user.id });

  res.status(201).json({ user, accessToken, refreshToken });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken  = signAccessToken({ user_id: user.id, role: user.role });
  const refreshToken = signRefreshToken({ user_id: user.id });

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken });
}

export async function refreshToken(req, res) {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'Refresh token required' });
  try {
    const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = signAccessToken({ user_id: decoded.user_id });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function logout(req, res) {
  // Stateless JWT: client drops tokens. Add Redis blocklist here for server-side invalidation.
  res.json({ ok: true });
}
