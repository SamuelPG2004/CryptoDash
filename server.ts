import express from 'express';
import helmet from 'helmet';
import { env, validateEnv } from './src/backend/config/env.js';
import { requireDB } from './src/backend/config/db.js';
import { errorHandler } from './src/backend/middleware/errorHandler.js';
import { generalLimiter } from './src/backend/middleware/rateLimiter.js';
import authRoutes from './src/backend/routes/authRoutes.js';
import userRoutes from './src/backend/routes/userRoutes.js';
import cryptoRoutes from './src/backend/routes/cryptoRoutes.js';
import newsRoutes from './src/backend/routes/newsRoutes.js';

// ─── Validate environment on startup ─────────────────────────────────────
validateEnv();

const app = express();

// ─── Security middleware ──────────────────────────────────────────────────
app.use(helmet({
  // Allow inline scripts/styles for React SPA
  contentSecurityPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));

// ─── General rate limiter (100 req/min per IP) ───────────────────────────
app.use('/api', generalLimiter);

// ─── API routes ──────────────────────────────────────────────────────────
// Auth and User routes require MongoDB connection (via requireDB middleware)
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/users', requireDB, userRoutes);

// Crypto prices do NOT need MongoDB — uses CoinGecko API with caching
app.use('/api/crypto', cryptoRoutes);

// News/AI analysis does NOT need MongoDB — uses Gemini API
app.use('/api/news', newsRoutes);

// ─── Centralized error handler (MUST be after all routes) ────────────────
app.use(errorHandler);

// ─── Vite dev server (only in local development, skipped on Vercel) ──────
if (!env.IS_VERCEL && env.NODE_ENV !== 'production') {
  (async () => {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Failed to start Vite dev server:', err);
    }
  })();
} else if (!env.IS_VERCEL) {
  // Production build served locally
  app.use(express.static('dist'));
  app.get('*', (_req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

// ─── Start HTTP server (only when running directly, not on Vercel) ───────
if (!env.IS_VERCEL) {
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  });
}

export default app;
