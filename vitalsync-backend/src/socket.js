import { Server } from 'socket.io';
import { verifyToken } from './utils/jwt.js';
import logger from './utils/logger.js';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // JWT middleware for WebSocket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = verifyToken(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { user_id } = socket.user;
    socket.join(`user:${user_id}`);
    logger.info({ user_id, socketId: socket.id }, 'WebSocket connected');

    socket.on('subscribe:device', (device_id) => {
      socket.join(`device:${device_id}`);
    });

    socket.on('unsubscribe:device', (device_id) => {
      socket.leave(`device:${device_id}`);
    });

    socket.on('disconnect', () => {
      logger.info({ user_id, socketId: socket.id }, 'WebSocket disconnected');
    });
  });

  return io;
}

export { io };
