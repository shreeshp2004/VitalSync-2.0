import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getAlerts, markRead } from '../controllers/alerts.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/',           getAlerts);
router.patch('/:id/read', markRead);

export default router;
