import express from 'express';
import {
    analyzeWithAI,
    getNewsFeed,
    analyzeMarketWithAI,
} from '../controllers/newsController.js';
import { validate } from '../middleware/validate.js';
import { analyzeSchema, marketAnalyzeSchema } from '../validators/cryptoValidators.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// POST /api/news/analyze — análisis simple de moneda (flujo existente).
// `protect`: los endpoints de IA consumen cuota de pago de Groq — solo
// usuarios autenticados pueden invocarlos (el rate limit por IP no basta).
router.post('/analyze', protect, aiLimiter, validate(analyzeSchema), asyncHandler(analyzeWithAI));

// El generalLimiter global de /api ya cubre /feed — repetirlo aquí duplicaba
// el contador por request (límite efectivo de 50/min en lugar de 100/min).
router.get('/feed', asyncHandler(getNewsFeed));

// POST /api/news/market-analyze — análisis técnico estructurado
router.post(
    '/market-analyze',
    protect,
    aiLimiter,                             // 10 req/min — mismo limitador de IA
    validate(marketAnalyzeSchema),
    asyncHandler(analyzeMarketWithAI)
);

export default router;
