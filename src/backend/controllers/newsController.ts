import { Request, Response, NextFunction } from 'express';
import { analyzeCoin } from '../services/geminiService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import Parser from 'rss-parser';

const parser = new Parser();

export const getNewsFeed = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const feed = await parser.parseURL('https://cointelegraph.com/rss/tag/bitcoin');
        const news = feed.items.slice(0, 10).map(item => ({
            id: item.guid || item.id || item.link || Math.random().toString(),
            title: item.title,
            source: 'CoinTelegraph',
            url: item.link,
            time: item.pubDate ? new Date(item.pubDate).toLocaleString() : 'Reciente',
            sentiment: 'neutral'
        }));
        res.json(news);
    } catch (error: any) {
        logger.error('Error fetching news feed', { error: error.message });
        next(new AppError('Error al obtener el feed de noticias', 500));
    }
};

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
        if (error.message.includes('Too Many Requests') || error.message.includes('quota')) {
            return next(new AppError('Se ha superado el límite de uso de Gemini AI. Intenta más tarde o revisa tu plan.', 429));
        }

        next(new AppError('Error al generar el análisis con IA', 500));
    }
};
