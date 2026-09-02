import express from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/authValidators.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// POST /api/auth/register — rate limited + validated
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));

// POST /api/auth/login — rate limited + validated
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));

// POST /api/auth/forgot-password — rate limited + validated
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPassword));

// POST /api/auth/reset-password — rate limited + validated
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
