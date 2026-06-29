import rateLimit from 'express-rate-limit';

// ─── Rate limiters ────────────────────────────────────────────────────────
// Note: X-Forwarded-For is read correctly because `trust proxy` is configured
// in server.ts for production/Vercel environments. No manual keyGenerator needed.

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,
    message: { status: 'error', message: 'Demasiados intentos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 10,
    message: { status: 'error', message: 'Demasiadas solicitudes de IA.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const tradeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 30,
    message: { status: 'error', message: 'Demasiadas operaciones.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 100,
    message: { status: 'error', message: 'Demasiadas solicitudes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
