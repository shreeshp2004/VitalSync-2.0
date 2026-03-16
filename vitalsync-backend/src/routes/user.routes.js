import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getProfile, updateProfile } from '../controllers/user.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/profile',   getProfile);
router.patch('/profile', updateProfile);

export default router;
