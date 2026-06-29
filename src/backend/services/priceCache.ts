import axios from 'axios';
import { logger } from '../utils/logger.js';

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
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let cachedCoins: CachedCoin[] = [];
let lastFetchTime = 0;
let isFetching = false;

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h';

/**
 * Fetches fresh market data from CoinGecko and populates the shared cache.
 * Prevents concurrent fetches with a simple flag.
 */
export async function refreshPriceCache(): Promise<void> {
  if (isFetching) return;
  isFetching = true;

  try {
    const { data } = await axios.get(COINGECKO_URL, {
      timeout: 4500,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CryptoDash/1.0 (educational project)',
      },
    });

    cachedCoins = data
      .filter((coin: any) => coin?.id && coin.symbol)
      .map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name || coin.id,
        price: coin.current_price || 0,
        change: coin.price_change_percentage_24h || 0,
        image: coin.image || '',
        sparkline: coin.sparkline_in_7d?.price || [],
      }));

    lastFetchTime = Date.now();
    logger.info(`[PriceCache] Refreshed — ${cachedCoins.length} coins cached`);
  } catch (err: any) {
    logger.warn('[PriceCache] CoinGecko fetch failed, keeping stale cache', { error: err.message });
  } finally {
    isFetching = false;
  }
}

/**
 * Returns the entire cached coin list, refreshing if stale.
 * Used by cryptoRoutes to serve the frontend.
 */
export async function getCachedPrices(): Promise<CachedCoin[]> {
  const stale = Date.now() - lastFetchTime > CACHE_DURATION;
  if (stale || cachedCoins.length === 0) {
    await refreshPriceCache();
  }
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
  // Refresh cache if stale
  if (Date.now() - lastFetchTime > CACHE_DURATION || cachedCoins.length === 0) {
    await refreshPriceCache();
  }

  const coin = cachedCoins.find(c => c.id === coinId);
  return coin ? coin.price : null;
}
