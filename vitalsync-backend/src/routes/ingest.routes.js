import express from 'express';
import { ingest } from '../controllers/ingest.controller.js';

const router = express.Router();

// Device posts sensor data here (authenticated via X-Device-Token header)
router.post('/', ingest);

export default router;
