import express from 'express';
import axios from 'axios';

const router = express.Router();

// Simple in-memory cache to avoid 429 Rate Limit errors
let cachedPrices: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // Cache for 60 seconds

router.get('/prices', async (req, res) => {
  const now = Date.now();

  // Return cached data if it's still fresh (60 seconds)
  if (cachedPrices && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json(cachedPrices);
  }

  try {
    // Fetching Top 50 coins with sparkline data for charts
    const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h', {
      timeout: 8000
    });
    
    const formattedData = data
      .filter((coin: any) => coin && coin.id && coin.symbol)
      .map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name || coin.id,
        price: coin.current_price || 0,
        change: coin.price_change_percentage_24h || 0,
        image: coin.image || '',
        sparkline: coin.sparkline_in_7d?.price || []
      }));

    // Update cache
    cachedPrices = formattedData;
    lastFetchTime = now;

    res.json(formattedData);
  } catch (error: any) {
    console.error('Error proxying crypto prices:', error.message);
    
    // If we have cached data (even if expired), return it on error
    if (cachedPrices) {
      return res.json(cachedPrices);
    }

    // Ultimate fallback: Mock Data for Top 5 coins if everything fails
    const mockData = [
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 64000, change: 1.2, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', sparkline: Array(24).fill(64000).map(v => v + Math.random() * 100) },
      { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3400, change: -0.5, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', sparkline: Array(24).fill(3400).map(v => v + Math.random() * 50) },
    ];
    
    res.json(mockData);
  }
});

export default router;
