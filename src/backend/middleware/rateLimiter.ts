import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication routes (login, register).
 * 20 requests per 15 minutes per IP.
 *
 * NOTE: In Vercel serverless, the in-memory store resets on cold starts.
 * For production SaaS, replace with a Redis-backed store (e.g., rate-limit-redis).
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        status: 'error',
        message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Soporte para Vercel/proxies: usa X-Forwarded-For si existe
        const xfwd = req.headers['x-forwarded-for'];
        if (typeof xfwd === 'string') {
            return xfwd.split(',')[0].trim();
        } else if (Array.isArray(xfwd)) {
            return xfwd[0].trim();
        }
        return req.ip;
    },
});

/**
 * Rate limiter for AI analysis endpoints.
 * 10 requests per minute per IP.
 */
export const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: {
        status: 'error',
        message: 'Demasiadas solicitudes de análisis IA. Espera un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for trading operations (buy/sell).
 * 30 requests per minute per IP.
 */
export const tradeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: {
        status: 'error',
        message: 'Demasiadas operaciones de trading. Espera un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter.
 * 100 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: {
        status: 'error',
        message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
