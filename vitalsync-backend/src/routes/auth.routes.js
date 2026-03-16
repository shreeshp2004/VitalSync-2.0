import express from 'express';
import { register, login, refreshToken, logout } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import Joi from 'joi';

const router = express.Router();

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role:     Joi.string().valid('athlete','coach').default('athlete')
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required()
});

router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema),    login);
router.post('/refresh',                             refreshToken);
router.post('/logout',                              logout);

export default router;
