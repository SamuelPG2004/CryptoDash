import type { Express } from 'express';
import { env } from './env.js';

/**
 * @fileoverview viteDevServer — Configura el middleware de Vite en modo desarrollo.
 *
 * Responsabilidad: únicamente inicializar el dev server de Vite (HMR + SPA) y
 * montar sus middlewares en la app Express cuando se ejecuta localmente en desarrollo.
 *
 * En Vercel o producción local esta función no hace nada; el frontend se sirve
 * desde `dist` vía `setupStaticServer`.
 */
export function setupViteDevServer(app: Express): void {
    if (env.IS_VERCEL || env.NODE_ENV === 'production') {
        return;
    }

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
}
