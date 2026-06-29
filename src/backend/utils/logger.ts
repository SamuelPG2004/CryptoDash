/**
 * @fileoverview logger — Logger estructurado JSON para CryptoDash.
 *
 * Emite JSON estructurado por stdout/stderr para integración directa con
 * agregadores de logs (Vercel Logs, Datadog, Logtail, etc.).
 *
 * REFACTORIZACIÓN:
 *  - Eliminado `Record<string, any>` → tipado como `Record<string, unknown>`
 *  - En NODE_ENV=test los logs de nivel INFO se silencian para output de test limpio
 *  - Audit logs siempre visibles (nivel AUDIT nunca se silencia)
 *
 * @module utils/logger
 */

const isTest = process.env.NODE_ENV === 'test';
const getTimestamp = (): string => new Date().toISOString();

export const logger = {
    info: (message: string, meta?: Record<string, unknown>): void => {
        if (isTest) return;  // Silenciar INFO en tests para output limpio
        console.log(JSON.stringify({ level: 'INFO', timestamp: getTimestamp(), message, ...meta }));
    },

    warn: (message: string, meta?: Record<string, unknown>): void => {
        if (isTest) return;  // Silenciar WARN en tests
        console.warn(JSON.stringify({ level: 'WARN', timestamp: getTimestamp(), message, ...meta }));
    },

    error: (message: string, meta?: Record<string, unknown>): void => {
        // Los ERROR siempre se muestran, incluso en tests — son bugs reales
        console.error(JSON.stringify({ level: 'ERROR', timestamp: getTimestamp(), message, ...meta }));
    },

    /**
     * Log de auditoría para operaciones sensibles (login, buy, sell, cambios de perfil).
     * NUNCA se silencia — es un registro de compliance y seguridad.
     */
    audit: (action: string, userId: string, meta?: Record<string, unknown>): void => {
        console.log(JSON.stringify({
            level: 'AUDIT',
            timestamp: getTimestamp(),
            action,
            userId,
            ...meta,
        }));
    },
};
