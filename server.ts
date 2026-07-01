
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { env, validateEnv } from './src/backend/config/env.js';
import { requireDB, connectToDatabase } from './src/backend/config/db.js';
import { errorHandler } from './src/backend/middleware/errorHandler.js';
import { generalLimiter } from './src/backend/middleware/rateLimiter.js';
import { setupViteDevServer } from './src/backend/config/viteDevServer.js';
import { setupStaticServer } from './src/backend/config/staticServer.js';
import authRoutes from './src/backend/routes/authRoutes.js';
import userRoutes from './src/backend/routes/userRoutes.js';
import cryptoRoutes from './src/backend/routes/cryptoRoutes.js';
import newsRoutes from './src/backend/routes/newsRoutes.js';
import transactionRoutes from './src/backend/routes/transactionRoutes.js';
import { startAlertChecker, stopAlertChecker } from './src/backend/services/alertChecker.js';

// ─── Validate environment on startup ─────────────────────────────────────
validateEnv();

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = http.createServer(app);

// ─── Allowed origins ──────────────────────────────────────────────────────
// In production only allow the configured APP_URL; in dev allow localhost variants.
const allowedOrigins = env.NODE_ENV === 'production'
  ? [env.APP_URL]
  : ['http://localhost:3000', 'http://localhost:5173', env.APP_URL];

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Socket.IO — JWT-authenticated room subscription ─────────────────────
// Fix #3: clients must send a valid JWT (not just a userId string).
// The server extracts the userId from the verified token.
io.on('connection', (socket) => {
  socket.on('auth', (token: string) => {
    if (!token) return;
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
      socket.join(decoded.id);
      socket.data.userId = decoded.id;
    } catch {
      // Invalid or expired token — disconnect the socket immediately
      socket.disconnect(true);
    }
  });
});

// Expose io globally for use in services/controllers
app.set('io', io);

// ─── Trust proxy (required for rate limiters behind Vercel/Nginx) ─────────
// Fix #9: without this, express-rate-limit cannot read X-Forwarded-For correctly.
if (env.IS_VERCEL || env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── CORS ─────────────────────────────────────────────────────────────────
// Fix #14: explicit CORS config so browsers receive correct preflight responses.
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Security middleware ──────────────────────────────────────────────
// Fix #5: configure a real CSP instead of disabling it entirely.
// In development, Vite dev server injects inline scripts for HMR and module
// loading that are incompatible with a strict CSP. Disable CSP in dev to
// avoid blocking the frontend; enforce it in production only.
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production'
    ? {
        directives: {
          defaultSrc:  ["'self'"],
          scriptSrc:   ["'self'"],
          styleSrc:    ["'self'", "'unsafe-inline'"],
          imgSrc:      ["'self'", "data:", "https://assets.coingecko.com"],
          connectSrc:  ["'self'", "https://api.coingecko.com", "https://api.groq.com", "wss:"],
          fontSrc:     ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
          objectSrc:   ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,  // Disable CSP in development — Vite needs inline scripts for HMR
}));
app.use(express.json({ limit: '1mb' }));

// ─── General rate limiter (100 req/min per IP) ───────────────────────────
app.use('/api', generalLimiter);

// ─── API routes ──────────────────────────────────────────────────────────
// Auth and User routes require MongoDB connection (via requireDB middleware)
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/users', requireDB, userRoutes);
app.use('/api/transactions', requireDB, transactionRoutes);

// Crypto prices do NOT need MongoDB — uses CoinGecko API with caching
app.use('/api/crypto', cryptoRoutes);

// News/AI analysis does NOT need MongoDB — uses Groq API
app.use('/api/news', newsRoutes);

// ─── Centralized error handler (MUST be after all routes) ────────────────
app.use(errorHandler);

// ─── Frontend serving (dev = Vite, prod local = static build, Vercel = none) ─
setupViteDevServer(app);
setupStaticServer(app);

// ─── Start HTTP server (only when running directly, not on Vercel) ───────

if (!env.IS_VERCEL && env.NODE_ENV !== 'test') {
  const startServer = () => {
    server.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    });
  };

  connectToDatabase().then(() => {
    startServer();
    startAlertChecker(io);
  }).catch((err) => {
    console.warn('⚠️ No se pudo conectar a MongoDB al iniciar el servidor (continuando sin DB):', err.message || err);
    startServer();
  });

  // ─── Graceful shutdown ─────────────────────────────────────────────────
  // Stops the alert checker interval and closes the HTTP server cleanly
  // before the process exits. Prevents zombie intervals during deploys.
  const gracefulShutdown = (signal: string): void => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    stopAlertChecker();
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force exit after 10s if connections refuse to close
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

export default app;
