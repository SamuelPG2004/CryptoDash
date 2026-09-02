/**
 * @fileoverview internalRoutes — Endpoints internos invocados por infraestructura,
 * no por usuarios (crons de Vercel, health checks de plataforma, etc.).
 *
 * POR QUÉ EXISTE ESTE ENDPOINT:
 *  En Vercel (serverless) el proceso no es persistente, así que el intervalo
 *  de `startAlertChecker()` nunca corre — las alertas de precio jamás se
 *  dispararían en producción. La solución es un Vercel Cron (vercel.json →
 *  "crons") que invoca GET /api/internal/check-alerts periódicamente y
 *  ejecuta un ciclo de verificación bajo demanda.
 *
 * SEGURIDAD:
 *  Vercel envía automáticamente `Authorization: Bearer <CRON_SECRET>` en cada
 *  invocación de cron cuando la variable de entorno CRON_SECRET está definida
 *  en el proyecto. En producción el endpoint rechaza cualquier request sin
 *  ese header. En desarrollo se permite sin secret para pruebas locales.
 *
 * @module routes/internalRoutes
 */

import express, { Request, Response } from 'express';
import { runAlertCheckCycle } from '../services/alertChecker.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GET /api/internal/check-alerts — ejecuta un ciclo de verificación de alertas.
// GET (y no POST) porque los Vercel Crons solo hacen requests GET.
router.get('/check-alerts', asyncHandler(async (req: Request, res: Response) => {
    if (env.NODE_ENV === 'production') {
        if (!env.CRON_SECRET) {
            logger.error('[Internal] CRON_SECRET no configurado — endpoint de cron deshabilitado');
            return res.status(503).json({ status: 'error', message: 'Cron no configurado' });
        }
        if (req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
            return res.status(401).json({ status: 'error', message: 'No autorizado' });
        }
    }

    const stats = await runAlertCheckCycle(req.app.get('io'));
    res.json({ status: 'ok', ...stats });
}));

export default router;
