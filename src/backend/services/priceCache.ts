import axios from 'axios';
import { logger } from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

/**
 * Shared in-memory price cache for server-side price verification.
 *
 * Used by:
 *  - cryptoRoutes  — GET /api/crypto/prices (populates cache for the frontend)
 *  - userController — buyCrypto / sellCrypto (price injection fix #7)
 *  - alertChecker  — checks active alerts against current prices
 *
 * Design: single source of truth so all services share the same cached data
 * and avoid redundant calls to CoinGecko.
 */

interface CachedCoin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  image: string;
  sparkline: number[];
  /** Volumen de trading 24h en USD — usado por el análisis de IA */
  volume: number;
}

/** Forma cruda de un item de /coins/markets de CoinGecko (solo los campos usados) */
interface CoinGeckoMarketItem {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  image?: string;
  sparkline_in_7d?: { price?: number[] };
  total_volume?: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REDIS_KEY = 'crypto_prices';

let cachedCoins: CachedCoin[] = [];
let lastFetchTime = 0;
// Deduplica fetches concurrentes: todas las requests esperan la misma promesa
// en lugar de recibir una cache vacía mientras otra request refresca.
let inflightRefresh: Promise<void> | null = null;

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h';

const isL1Fresh = (): boolean =>
  cachedCoins.length > 0 && Date.now() - lastFetchTime <= CACHE_DURATION;

/**
 * Fetches fresh market data from CoinGecko and populates the shared cache.
 * Concurrent callers share the same in-flight request.
 */
export function refreshPriceCache(): Promise<void> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const { data } = await axios.get<CoinGeckoMarketItem[]>(COINGECKO_URL, {
        timeout: 4500,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CryptoDash/1.0 (educational project)',
        },
      });

      cachedCoins = data
        .filter((coin): coin is CoinGeckoMarketItem & { id: string; symbol: string } =>
          Boolean(coin?.id && coin.symbol))
        .map((coin) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name || coin.id,
          price: coin.current_price || 0,
          change: coin.price_change_percentage_24h || 0,
          image: coin.image || '',
          sparkline: coin.sparkline_in_7d?.price || [],
          volume: coin.total_volume || 0,
        }));

      lastFetchTime = Date.now();
      logger.info(`[PriceCache] Refreshed — ${cachedCoins.length} coins cached (L1)`);

      const redis = getRedisClient();
      if (redis) {
        // Guardar en Redis (L2 Cache)
        await redis.set(REDIS_KEY, JSON.stringify({
          timestamp: lastFetchTime,
          data: cachedCoins
        }), { EX: 300 }); // Expira en 5 minutos
        logger.info(`[PriceCache] Saved to Redis (L2)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('[PriceCache] CoinGecko fetch failed, keeping stale cache', { error: message });
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/**
 * Returns the entire cached coin list, refreshing if stale.
 * Used by cryptoRoutes to serve the frontend.
 *
 * Orden de lectura (optimizado para respuesta <200ms):
 *  1. L1 (memoria) si está fresca — 0 saltos de red.
 *  2. L2 (Redis) — rehidrata la L1 para que las siguientes lecturas sean locales.
 *  3. CoinGecko (refresh) — puebla L1 y L2.
 *  4. Si todo falla, devuelve la L1 obsoleta (mejor stale que vacío en plena demo).
 */
export async function getCachedPrices(): Promise<CachedCoin[]> {
  if (isL1Fresh()) return cachedCoins;

  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(REDIS_KEY);
      if (typeof cached === 'string' && cached.length > 0) {
        const parsed = JSON.parse(cached) as { timestamp?: number; data?: CachedCoin[] };
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          // Rehidratar L1 desde Redis — las próximas lecturas no pagan el salto de red
          cachedCoins = parsed.data;
          lastFetchTime = parsed.timestamp ?? Date.now();
          return cachedCoins;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('[PriceCache] Failed to read from Redis, falling back to L1', { error: message });
    }
  }

  await refreshPriceCache();
  return cachedCoins;
}

/**
 * Returns the verified server-side price for a given coinId.
 * Returns null if the coin is not in the cache after a refresh attempt.
 *
 * Fix #7: this is the ONLY function that should be used to get prices
 * for financial operations (buy/sell). Never trust req.body.price.
 */
export async function getVerifiedPrice(coinId: string): Promise<number | null> {
  const coins = await getCachedPrices();
  const coin = coins.find(c => c.id === coinId);
  return coin ? coin.price : null;
}
