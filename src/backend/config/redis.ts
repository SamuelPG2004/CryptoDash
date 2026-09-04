import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

let redisClient: RedisClientType | null = null;
export let isRedisConnected = false;

export async function initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        logger.warn('[Redis] REDIS_URL not provided. Running in Fallback Mode (L1 Cache Only).');
        return;
    }

    try {
        redisClient = createClient({ url: redisUrl });

        redisClient.on('error', (err) => {
            if (isRedisConnected) {
                logger.error('[Redis] Connection Error. Falling back to L1 Cache.', { error: err.message });
                isRedisConnected = false;
            }
        });

        // 'ready' (no 'connect'): en 'connect' el socket existe pero el cliente
        // aún no acepta comandos — marcarlo disponible antes de tiempo encolaba requests.
        redisClient.on('ready', () => {
            logger.info('[Redis] Connected and ready.');
            isRedisConnected = true;
        });

        redisClient.on('reconnecting', () => {
            logger.warn('[Redis] Reconnecting...');
            isRedisConnected = false;
        });

        await redisClient.connect();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[Redis] Failed to initialize. Running in Fallback Mode (L1 Cache Only).', { error: message });
        redisClient = null;
        isRedisConnected = false;
    }
}

export function getRedisClient(): RedisClientType | null {
    return isRedisConnected ? redisClient : null;
}

/** Cierra la conexión de Redis limpiamente (usado en el graceful shutdown). */
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {
            // Si quit falla (conexión ya caída), forzar el cierre del socket
            redisClient.destroy();
        }
        redisClient = null;
        isRedisConnected = false;
    }
}
