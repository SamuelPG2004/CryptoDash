import express from 'express';
import { analyzeWithAI } from '../controllers/newsController.js';
import { validate } from '../middleware/validate.js';
import { analyzeSchema } from '../validators/cryptoValidators.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// POST /api/news/analyze — rate limited (10/min) + validated + async-safe
router.post('/analyze', aiLimiter, validate(analyzeSchema), asyncHandler(analyzeWithAI));

export default router;
