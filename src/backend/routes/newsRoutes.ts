import express from 'express';
import {
    analyzeWithAI,
    getNewsFeed,
    analyzeMarketWithAI,
} from '../controllers/newsController.js';
import { validate } from '../middleware/validate.js';
import { analyzeSchema, marketAnalyzeSchema } from '../validators/cryptoValidators.js';
import { aiLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// POST /api/news/analyze — análisis simple de moneda (flujo existente)
router.post('/analyze', aiLimiter, validate(analyzeSchema), asyncHandler(analyzeWithAI));
router.get('/feed', generalLimiter, asyncHandler(getNewsFeed));

// POST /api/news/market-analyze — análisis técnico estructurado (MarketAnalyzer.tsx)
router.post(
    '/market-analyze',
    aiLimiter,                             // 10 req/min — mismo limitador de IA
    validate(marketAnalyzeSchema),
    asyncHandler(analyzeMarketWithAI)
);

export default router;
