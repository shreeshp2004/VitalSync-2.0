import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { registerDevice, listDevices, deactivateDevice } from '../controllers/device.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/',          listDevices);
router.post('/register', registerDevice);
router.delete('/:id',    deactivateDevice);

export default router;
