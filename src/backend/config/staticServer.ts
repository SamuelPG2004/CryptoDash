import type { Express } from 'express';
import express from 'express';
import { env } from './env.js';

/**
 * @fileoverview staticServer — Sirve el build estático de producción.
 *
 * Responsabilidad: únicamente montar `express.static('dist')` y devolver
 * `dist/index.html` para rutas SPA cuando se ejecuta localmente en producción.
 *
 * En Vercel o desarrollo local esta función no hace nada; el frontend es
 * manejado por Vercel mismo o por `setupViteDevServer` respectivamente.
 */
export function setupStaticServer(app: Express): void {
    if (env.IS_VERCEL || env.NODE_ENV !== 'production') {
        return;
    }

    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
        res.sendFile('dist/index.html', { root: '.' });
    });
}
