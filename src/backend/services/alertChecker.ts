
import axios from 'axios';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import type { Server as SocketIOServer } from 'socket.io';

const ALERT_CHECK_INTERVAL = 5 * 60 * 1000; // every 5 minutes (aligned with CoinGecko cache)

let latestPrices: Record<string, number> = {}; // coinId -> price in USD

/**
 * Fetches current prices from CoinGecko and updates the local cache.
 */
async function refreshPrices(): Promise<void> {
  try {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false',
      { timeout: 8000, headers: { 'Accept': 'application/json', 'User-Agent': 'CryptoDash/1.0' } }
    );
    const map: Record<string, number> = {};
    for (const coin of data) {
      if (coin?.id && typeof coin.current_price === 'number') {
        map[coin.id] = coin.current_price;
      }
    }
    latestPrices = map;
    logger.info(`[AlertChecker] Prices refreshed — ${Object.keys(map).length} coins`);
  } catch (err: any) {
    logger.warn('[AlertChecker] Could not refresh prices, using stale cache', { error: err.message });
  }
}

/**
 * Checks all active user alerts against current prices.
 * Deactivates triggered alerts (marks active = false).
 */
async function checkAlerts(io?: SocketIOServer): Promise<void> {
  if (Object.keys(latestPrices).length === 0) {
    logger.warn('[AlertChecker] No price data available, skipping alert check');
    return;
  }

  try {
    // Only load users that actually have active alerts — efficient query
    const users = await User.find({ 'alerts.active': true }).select('alerts email fullName');

    let totalChecked = 0;
    let totalTriggered = 0;

    for (const user of users) {
      let modified = false;

      for (const alert of user.alerts) {
        if (!alert.active) continue;
        totalChecked++;

        const currentPrice = latestPrices[alert.coinId];
        if (currentPrice === undefined) continue;

        const triggered =
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);

        if (triggered) {
          alert.active = false;
          modified = true;
          totalTriggered++;

          logger.info('[AlertChecker] Alert triggered', {
            userId: user._id,
            coinId: alert.coinId,
            symbol: alert.symbol,
            condition: alert.condition,
            targetPrice: alert.targetPrice,
            currentPrice,
          });

          // Emitir notificación privada por socket.io
          if (io) {
            io.to(user._id.toString()).emit('alert', {
              coinId: alert.coinId,
              symbol: alert.symbol,
              condition: alert.condition,
              targetPrice: alert.targetPrice,
              currentPrice,
              triggeredAt: new Date(),
            });
          }
        }
      }

      if (modified) {
        await user.save();
      }
    }

    if (totalChecked > 0) {
      logger.info(`[AlertChecker] Checked ${totalChecked} alerts, triggered ${totalTriggered}`);
    }
  } catch (err: any) {
    logger.error('[AlertChecker] Error during alert check', { error: err.message });
  }
}

/**
 * Starts the alert checker background service.
 * Runs every ALERT_CHECK_INTERVAL ms.
 * Safe to call multiple times — returns the interval handle.
 */
export function startAlertChecker(io?: SocketIOServer): NodeJS.Timeout {
  logger.info('[AlertChecker] Starting background alert checker...');

  // Run immediately on start, then on interval
  const run = async () => {
    await refreshPrices();
    await checkAlerts(io);
  };

  run(); // first run right away (non-blocking)

  const handle = setInterval(run, ALERT_CHECK_INTERVAL);
  return handle;
}
