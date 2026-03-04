import express from 'express';
import { register, login } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// POST /api/auth/register — rate limited + validated
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));

// POST /api/auth/login — rate limited + validated
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));

export default router;
