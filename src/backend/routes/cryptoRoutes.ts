import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Cache duration: 5 minutes — prevents CoinGecko rate limit 429
// Note: in Vercel serverless this cache resets on cold starts, but
// 5 minutes is enough to handle traffic bursts within a warm instance.
let cachedPrices: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Comprehensive mock data for top 10 coins — used as fallback when CoinGecko is unavailable
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

router.get('/prices', async (req, res) => {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedPrices && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json(cachedPrices);
  }

  try {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h',
      {
        timeout: 4500,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoDash/1.0 (educational project)',
        }
      }
    );

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

    cachedPrices = formattedData;
    lastFetchTime = now;

    res.json(formattedData);
  } catch (error: any) {
    console.error('Error proxying crypto prices:', error.message);

    // Return stale cache before mock data
    if (cachedPrices) {
      return res.json(cachedPrices);
    }

    // Fallback: return mock data so the UI always shows something
    res.json(MOCK_DATA);
  }
});

router.post('/analyze', async (req, res) => {
  const { coinName, coinSymbol, currentPrice, change24h } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: 'API Key de Gemini no configurada' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analiza el estado actual de ${coinName} (${coinSymbol}). 
    Precio actual: $${currentPrice}. 
    Cambio en 24h: ${change24h}%. 
    Proporciona un análisis breve (máximo 100 palabras) sobre si es un buen momento para comprar, vender o mantener, basándote en la tendencia. 
    Responde en un tono profesional y directo en español.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ analysis: text });
  } catch (error: any) {
    console.error('Error with Gemini AI:', error);
    res.status(500).json({ message: 'Error al generar el análisis con IA' });
  }
});

export default router;
