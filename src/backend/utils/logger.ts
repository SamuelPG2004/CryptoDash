/**
 * Structured JSON logger for auditing and debugging.
 * Outputs structured JSON logs for easy parsing by log aggregators (Vercel, Datadog, etc).
 */

const getTimestamp = () => new Date().toISOString();

export const logger = {
    info: (message: string, meta?: Record<string, any>) => {
        console.log(JSON.stringify({ level: 'INFO', timestamp: getTimestamp(), message, ...meta }));
    },

    warn: (message: string, meta?: Record<string, any>) => {
        console.warn(JSON.stringify({ level: 'WARN', timestamp: getTimestamp(), message, ...meta }));
    },

    error: (message: string, meta?: Record<string, any>) => {
        console.error(JSON.stringify({ level: 'ERROR', timestamp: getTimestamp(), message, ...meta }));
    },

    /**
     * Audit log for sensitive operations (register, login, buy, sell, profile changes).
     * These logs should be retained for compliance and security review.
     */
    audit: (action: string, userId: string, meta?: Record<string, any>) => {
        console.log(JSON.stringify({
            level: 'AUDIT',
            timestamp: getTimestamp(),
            action,
            userId,
            ...meta,
        }));
    },
};
