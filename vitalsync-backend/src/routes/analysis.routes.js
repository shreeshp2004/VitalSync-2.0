import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getSummary, getTrends, getReport } from '../controllers/analysis.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', getSummary);
router.get('/trends',  getTrends);
router.get('/report',  getReport);

export default router;
