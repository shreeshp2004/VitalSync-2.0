import { verifyToken } from '../utils/jwt.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }
  const token = header.slice(7);
  try {
    req.user = verifyToken(token, process.env.JWT_ACCESS_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}
