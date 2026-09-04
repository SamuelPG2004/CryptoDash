/**
 * @fileoverview newsController — Controlador HTTP para noticias y análisis de IA.
 *
 * REFACTORIZACIÓN APLICADA (vs. versión original):
 *
 *  ✅ DIP (Dependency Inversion Principle):
 *     El controlador ya no importa `geminiService` directamente.
 *     Usa `AiProviderFactory.getProvider()` → depende de `IAiProvider`, no de Groq.
 *     Cambiar de proveedor de IA = cambiar `AI_PROVIDER` en `.env`. Cero código.
 *
 *  ✅ Error handling discriminado:
 *     Reemplaza el frágil `error.message.includes('...')` por switch sobre
 *     `AiProviderError.code` (tipo seguro, sin falsos positivos).
 *
 *  ✅ Seguridad en `getNewsFeed`:
 *     Reemplaza `Math.random()` como ID por un hash determinista de la URL
 *     (usa `crypto.createHash` — evita IDs no-deterministas que rompen React keys).
 *
 *  ✅ Clean Code:
 *     Separación de responsabilidades: `mapFeedItem`, `buildMockNews`, `resolveAiError`
 *     son funciones puras y testeables independientemente.
 *
 *  ✅ JSDoc completo con tipos de parámetros y retorno.
 *
 * @module controllers/newsController
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import Parser from 'rss-parser';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { AiProviderFactory } from '../adapters/ai/AiProviderFactory.js';
import { AiProviderError } from '../adapters/ai/IAiProvider.js';

// ─── Tipos locales ────────────────────────────────────────────────────────────

/**
 * Estructura de un ítem de noticias normalizado para el frontend.
 */
interface NewsItem {
    id: string;
    title: string;
    source: string;
    url: string;
    time: string;
    sentiment: 'positive' | 'negative' | 'neutral';
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RSS_FEED_URL   = 'https://cointelegraph.com/rss/tag/bitcoin';
const RSS_ITEM_LIMIT = 10;
// timeout de 5s: el default de rss-parser (60s) dejaba requests colgadas
// un minuto entero si CoinTelegraph no respondía.
const rssParser      = new Parser({ timeout: 5_000 });

// ─── Cache del feed RSS ───────────────────────────────────────────────────────
// Sin cache, cada request del frontend disparaba una llamada saliente a
// CoinTelegraph (riesgo de baneo de IP y latencias de segundos).
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;
let newsCache: { items: NewsItem[]; fetchedAt: number } | null = null;

// ─── Funciones puras auxiliares ───────────────────────────────────────────────

/**
 * Genera un ID determinista desde una URL usando SHA-256 truncado.
 * Reemplaza `Math.random()` del código original — los IDs deterministas
 * permiten reconciliación correcta en React y son seguros para logs.
 *
 * @param url - URL del artículo de noticias
 * @returns Hash hexadecimal de 16 caracteres
 */
function generateNewsId(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

/**
 * Normaliza un ítem del feed RSS al formato `NewsItem` esperado por el frontend.
 *
 * @param item - Ítem crudo del parser RSS
 * @returns NewsItem normalizado
 */
function mapFeedItem(item: Parser.Item): NewsItem {
    const url = item.link ?? '';
    return {
        id:        generateNewsId(url || item.guid || Date.now().toString()),
        title:     item.title     ?? 'Sin título',
        source:    'CoinTelegraph',
        url,
        time:      item.pubDate ? new Date(item.pubDate).toLocaleString('es-ES') : 'Reciente',
        sentiment: 'neutral',
    };
}

/**
 * Datos de fallback cuando el feed RSS no está disponible.
 * Marcados claramente con source 'MockNews' para identificación en logs.
 *
 * @returns Array de NewsItems de demostración
 */
function buildMockNews(): NewsItem[] {
    const now = new Date().toLocaleString('es-ES');
    return [
        {
            id:        'mock_btc_001',
            title:     'Bitcoin alcanza nuevo máximo semanal',
            source:    'MockNews',
            url:       '#',
            time:      now,
            sentiment: 'positive',
        },
        {
            id:        'mock_eth_002',
            title:     'Ethereum se mantiene estable pese a la volatilidad',
            source:    'MockNews',
            url:       '#',
            time:      now,
            sentiment: 'neutral',
        },
    ];
}

/**
 * Traduce un `AiProviderError` al `AppError` apropiado para la respuesta HTTP.
 * Centraliza toda la lógica de mapeo de errores de IA en un solo lugar.
 *
 * @param err - Error del proveedor de IA
 * @param context - Contexto para el mensaje de log
 * @returns AppError con código HTTP apropiado
 */
function resolveAiError(err: AiProviderError, context: string): AppError {
    logger.error(`newsController: AI error en ${context}`, {
        code:    err.code,
        message: err.message,
    });

    switch (err.code) {
        case 'API_KEY_MISSING':
            return new AppError('Servicio de IA no disponible — API Key no configurada.', 503);
        case 'RATE_LIMIT_EXCEEDED':
            return new AppError('Se ha superado el límite de uso de IA. Intenta más tarde.', 429);
        case 'SERVICE_UNAVAILABLE':
            return new AppError('El servicio de IA no está disponible temporalmente.', 503);
        case 'PARSE_ERROR':
            return new AppError('La respuesta del modelo no pudo ser procesada correctamente.', 500);
        default:
            return new AppError('Error al generar el análisis con IA.', 500);
    }
}

// ─── Handlers del controlador ──────────────────────────────────────────────────

/**
 * GET /api/news/feed
 * Obtiene los últimos artículos del feed RSS de CoinTelegraph.
 * Si el feed falla, devuelve datos de fallback (no rompe el cliente).
 *
 * @param _req - Request de Express (no usada)
 * @param res  - Response de Express
 */
export const getNewsFeed = async (_req: Request, res: Response): Promise<void> => {
    // 1. Cache fresca → respuesta inmediata sin salir a internet
    if (newsCache && Date.now() - newsCache.fetchedAt < NEWS_CACHE_TTL_MS) {
        res.set('Cache-Control', 'public, max-age=60');
        res.json(newsCache.items);
        return;
    }

    try {
        const feed  = await rssParser.parseURL(RSS_FEED_URL);
        const news  = feed.items.slice(0, RSS_ITEM_LIMIT).map(mapFeedItem);
        newsCache   = { items: news, fetchedAt: Date.now() };
        res.set('Cache-Control', 'public, max-age=60');
        res.json(news);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('newsController: error al obtener feed RSS', { error: message });
        // 2. Feed caído pero hay cache antigua → mejor stale que mock
        if (newsCache) {
            res.set('X-Data-Source', 'stale-cache');
            res.json(newsCache.items);
            return;
        }
        // 3. Fallback final — el cliente recibe datos de demo en lugar de un error 500
        res.set('X-Data-Source', 'mock');
        res.json(buildMockNews());
    }
};

/**
 * POST /api/news/analyze
 * Genera un análisis breve de compra/venta/mantener para una criptomoneda.
 * Input validado previamente por Zod middleware (`analyzeSchema`).
 *
 * @param req  - Request con body `{ coinName, coinSymbol, currentPrice, change24h }`
 * @param res  - Response con `{ analysis: string }`
 * @param next - NextFunction para pasar errores al errorHandler central
 */
export const analyzeWithAI = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { coinName, coinSymbol, currentPrice, change24h } = req.body;

    try {
        const aiProvider = AiProviderFactory.getProvider();
        const analysis   = await aiProvider.analyzeCoin({ coinName, coinSymbol, currentPrice, change24h });
        res.json({ analysis });
    } catch (err: unknown) {
        if (err instanceof AiProviderError) {
            return next(resolveAiError(err, 'analyzeWithAI'));
        }
        logger.error('newsController: error inesperado en analyzeWithAI', {
            error: err instanceof Error ? err.message : String(err),
            coin:  coinSymbol,
        });
        next(new AppError('Error al generar el análisis con IA.', 500));
    }
};

/**
 * POST /api/news/market-analyze
 * Genera un análisis técnico estructurado con sentimiento, soporte y resistencia.
 * Input validado previamente por Zod middleware (`marketAnalyzeSchema`).
 *
 * @param req  - Request con body `{ symbol, price, volume, change24h }`
 * @param res  - Response con objeto `MarketAnalysisOutput`
 * @param next - NextFunction para pasar errores al errorHandler central
 */
export const analyzeMarketWithAI = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { symbol, price, volume, change24h } = req.body;

    try {
        const aiProvider = AiProviderFactory.getProvider();
        const result     = await aiProvider.analyzeMarketData({
            symbol,
            price:     Number(price),
            volume:    Number(volume),
            change24h: Number(change24h),
        });
        res.json(result);
    } catch (err: unknown) {
        if (err instanceof AiProviderError) {
            return next(resolveAiError(err, 'analyzeMarketWithAI'));
        }
        logger.error('newsController: error inesperado en analyzeMarketWithAI', {
            error:  err instanceof Error ? err.message : String(err),
            symbol,
        });
        next(new AppError('Error al generar el análisis de mercado.', 500));
    }
};
