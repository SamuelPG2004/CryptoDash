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

        redisClient.on('connect', () => {
            logger.info('[Redis] Connected successfully.');
            isRedisConnected = true;
        });

        redisClient.on('reconnecting', () => {
            logger.warn('[Redis] Reconnecting...');
            isRedisConnected = false;
        });

        await redisClient.connect();
    } catch (error: any) {
        logger.error('[Redis] Failed to initialize. Running in Fallback Mode (L1 Cache Only).', { error: error.message });
        redisClient = null;
        isRedisConnected = false;
    }
}

export function getRedisClient(): RedisClientType | null {
    return isRedisConnected ? redisClient : null;
}
