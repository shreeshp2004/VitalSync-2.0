import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getLatest, getHistory, getSession } from '../controllers/vitals.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/latest',  getLatest);
router.get('/history', getHistory);
router.get('/session', getSession);

export default router;
