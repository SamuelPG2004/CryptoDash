import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// POST /api/news/analyze
// Receives coin details and returns a short generative analysis using Gemini.
router.post('/analyze', async (req, res) => {
  const { coinName, coinSymbol, currentPrice, change24h } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: 'API Key de Gemini no configurada' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analiza el estado actual de ${coinName} (${coinSymbol}). Precio actual: $${currentPrice}. Cambio en 24h: ${change24h}%. Proporciona un análisis breve (máximo 100 palabras) sobre si es un buen momento para comprar, vender o mantener, basándote en la tendencia. Responde en un tono profesional y directo en español.`;

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
