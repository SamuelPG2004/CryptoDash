import { Request, Response, NextFunction } from 'express';
import { analyzeCoin } from '../services/geminiService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/news/analyze
 * Receives coin data and returns an AI-generated market analysis.
 * Input is already validated by Zod middleware (analyzeSchema).
 */
export const analyzeWithAI = async (req: Request, res: Response, next: NextFunction) => {
    const { coinName, coinSymbol, currentPrice, change24h } = req.body;

    try {
        const analysis = await analyzeCoin({ coinName, coinSymbol, currentPrice, change24h });
        res.json({ analysis });
    } catch (error: any) {
        logger.error('Gemini AI analysis failed', { error: error.message, coin: coinSymbol });

        if (error.message.includes('no está configurada')) {
            return next(new AppError('Servicio de IA no disponible — API Key no configurada', 503));
        }

        next(new AppError('Error al generar el análisis con IA', 500));
    }
};
