import express from 'express';
import { logger } from '../utils/logger.js';
import { getCachedPrices } from '../services/priceCache.js';

const router = express.Router();

// ─── Mock data fallback ─────────────────────────────────────────────────
// Served only when CoinGecko is unreachable AND the shared cache is empty.
const MOCK_DATA = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 64000, change: 1.2, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', sparkline: Array.from({ length: 168 }, (_, i) => 64000 + Math.sin(i / 10) * 2000 + Math.random() * 500) },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3400, change: -0.5, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', sparkline: Array.from({ length: 168 }, (_, i) => 3400 + Math.sin(i / 8) * 150 + Math.random() * 50) },
  { id: 'solana', symbol: 'SOL', name: 'Solana', price: 145, change: 3.1, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', sparkline: Array.from({ length: 168 }, (_, i) => 145 + Math.sin(i / 6) * 10 + Math.random() * 3) },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 580, change: 0.8, image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', sparkline: Array.from({ length: 168 }, (_, i) => 580 + Math.sin(i / 9) * 20 + Math.random() * 5) },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 0.52, change: -1.2, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', sparkline: Array.from({ length: 168 }, (_, i) => 0.52 + Math.sin(i / 7) * 0.02 + Math.random() * 0.005) },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.45, change: 2.3, image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', sparkline: Array.from({ length: 168 }, (_, i) => 0.45 + Math.sin(i / 8) * 0.02 + Math.random() * 0.005) },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.12, change: 5.4, image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', sparkline: Array.from({ length: 168 }, (_, i) => 0.12 + Math.sin(i / 5) * 0.01 + Math.random() * 0.002) },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 35, change: -2.1, image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', sparkline: Array.from({ length: 168 }, (_, i) => 35 + Math.sin(i / 7) * 2 + Math.random() * 0.5) },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 7.2, change: 1.5, image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', sparkline: Array.from({ length: 168 }, (_, i) => 7.2 + Math.sin(i / 9) * 0.3 + Math.random() * 0.1) },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 14, change: 0.9, image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', sparkline: Array.from({ length: 168 }, (_, i) => 14 + Math.sin(i / 8) * 0.5 + Math.random() * 0.1) },
];

// ─── GET /api/crypto/prices ─────────────────────────────────────────────
// Delegates to the shared priceCache so buy/sell operations and this endpoint
// always read from the same cached data.
router.get('/prices', async (_req, res) => {
  try {
    const prices = await getCachedPrices();

    if (prices.length > 0) {
      return res.json(prices);
    }

    // Cache empty after refresh attempt — return mock data so UI always shows something
    logger.warn('CoinGecko unavailable and cache empty, returning mock data');
    res.json(MOCK_DATA);
  } catch (error: any) {
    logger.warn('CoinGecko fetch failed, using mock fallback', { error: error.message });
    res.json(MOCK_DATA);
  }
});

export default router;
