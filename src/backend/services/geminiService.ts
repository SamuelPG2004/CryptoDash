import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Dedicated service for Google Gemini AI interactions.
 * - Encapsulates ALL Gemini logic in one place.
 * - Uses lazy initialization (client created on first call).
 * - GEMINI_API_KEY is read ONLY from process.env, never exposed to the frontend.
 */

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        if (!env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
        }
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return genAI;
}

export interface CoinAnalysisInput {
    coinName: string;
    coinSymbol: string;
    currentPrice: number;
    change24h: number;
}

/**
 * Generates a brief market analysis for a given cryptocurrency using Gemini AI.
 * Returns a professional analysis in Spanish (max ~100 words).
 */
export async function analyzeCoin(input: CoinAnalysisInput): Promise<string> {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt =
        `Analiza el estado actual de ${input.coinName} (${input.coinSymbol}). ` +
        `Precio actual: $${input.currentPrice}. Cambio en 24h: ${input.change24h}%. ` +
        `Proporciona un análisis breve (máximo 100 palabras) sobre si es un buen momento para ` +
        `comprar, vender o mantener, basándote en la tendencia. ` +
        `Responde en un tono profesional y directo en español.`;

    logger.info('Gemini analysis requested', { coin: input.coinSymbol, price: input.currentPrice });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    logger.info('Gemini analysis completed', { coin: input.coinSymbol, chars: text.length });

    return text;
}
