import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes     from './routes/auth.routes.js';
import ingestRoutes   from './routes/ingest.routes.js';
import vitalsRoutes   from './routes/vitals.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import alertsRoutes   from './routes/alerts.routes.js';
import deviceRoutes   from './routes/device.routes.js';
import userRoutes     from './routes/user.routes.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/ingest',   ingestRoutes);
app.use('/api/vitals',   vitalsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/alerts',   alertsRoutes);
app.use('/api/devices',  deviceRoutes);
app.use('/api/user',     userRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
