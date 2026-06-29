import express from 'express';
import {
  getProfile,
  toggleFavorite,
  validatePin,
  updatePassword,
  updateProfile,
  buyCrypto,
  sellCrypto,
  addAlert,
  removeAlert
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { tradeLimiter, authLimiter } from '../middleware/rateLimiter.js';
import {
  updateProfileSchema,
  updatePasswordSchema,
  validatePinSchema,
  toggleFavoriteSchema,
} from '../validators/userValidators.js';
import { buySchema, sellSchema } from '../validators/cryptoValidators.js';

const router = express.Router();

// All user routes require authentication
router.get('/profile', protect, asyncHandler(getProfile));
router.post('/favorites', protect, validate(toggleFavoriteSchema), asyncHandler(toggleFavorite));
// Fix #10: validate-pin needs rate limiting — a 4-digit PIN has only 10,000 combinations
router.post('/validate-pin', protect, authLimiter, validate(validatePinSchema), asyncHandler(validatePin));
router.put('/password', protect, authLimiter, validate(updatePasswordSchema), asyncHandler(updatePassword));
router.put('/profile', protect, validate(updateProfileSchema), asyncHandler(updateProfile));

// Trading routes — rate limited + validated
router.post('/buy', protect, tradeLimiter, validate(buySchema), asyncHandler(buyCrypto));
router.post('/sell', protect, tradeLimiter, validate(sellSchema), asyncHandler(sellCrypto));

// Alerts routes
router.post('/alerts', protect, asyncHandler(addAlert));
router.delete('/alerts/:id', protect, asyncHandler(removeAlert));

export default router;
