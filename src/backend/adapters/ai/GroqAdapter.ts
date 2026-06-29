/**
 * @fileoverview GroqAdapter — Implementación concreta del Patrón Adapter para la API de Groq.
 *
 * RESPONSABILIDADES DE ESTA CLASE:
 *  1. Encapsular TODA comunicación HTTP con api.groq.com
 *  2. Manejar reintentos con backoff exponencial (resilencia ante fallos transitorios)
 *  3. Parsear la respuesta del LLM al contrato `MarketAnalysisOutput`
 *  4. Traducir errores HTTP/red al tipo discriminado `AiProviderError`
 *
 * SEGURIDAD:
 *  - La API Key se lee ÚNICAMENTE de `env.GROQ_API_KEY` (nunca de parámetros externos)
 *  - Cada request tiene un timeout de 15s para evitar cuelgues indefinidos
 *  - Los prompts están parametrizados, sin interpolación directa de input del usuario
 *    en posiciones de control (solo en campos de datos)
 *
 * @module adapters/ai/GroqAdapter
 */

import axios, { AxiosError } from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import {
    IAiProvider,
    CoinAnalysisInput,
    MarketAnalysisInput,
    MarketAnalysisOutput,
    AiProviderError,
} from './IAiProvider.js';

// ─── Constantes internas ──────────────────────────────────────────────────────

const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES   = 2;
const BASE_DELAY_MS = 500;

// ─── Utilidades privadas ──────────────────────────────────────────────────────

/**
 * Pausa la ejecución durante `ms` milisegundos.
 * @param ms - Milisegundos a esperar
 */
const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clasifica un error de Axios/red en un `AiProviderError` tipado.
 * Reemplaza el frágil patrón `error.message.includes('...')` del código original.
 *
 * @param err - Error capturado en el bloque catch
 * @returns AiProviderError con código discriminado
 */
function classifyError(err: unknown): AiProviderError {
    if (err instanceof AxiosError) {
        const status = err.response?.status;
        if (status === 429) {
            return new AiProviderError('RATE_LIMIT_EXCEEDED', 'Límite de peticiones de IA superado. Intenta más tarde.');
        }
        if (status === 401 || status === 403) {
            return new AiProviderError('API_KEY_MISSING', 'API Key de IA inválida o no configurada.');
        }
        if (status && status >= 500) {
            return new AiProviderError('SERVICE_UNAVAILABLE', 'El servicio de IA no está disponible temporalmente.');
        }
        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
            return new AiProviderError('SERVICE_UNAVAILABLE', 'El servicio de IA tardó demasiado en responder.');
        }
    }
    if (err instanceof AiProviderError) return err;

    return new AiProviderError('UNKNOWN_ERROR', 'Error desconocido al contactar el servicio de IA.');
}

/**
 * Parsea la respuesta de texto del LLM al tipo estructurado `MarketAnalysisOutput`.
 * Utiliza expresiones regulares robustas (case-insensitive, espaciado flexible).
 *
 * @param text - Respuesta cruda del LLM
 * @returns Objeto de análisis estructurado
 * @throws {AiProviderError} Con código `PARSE_ERROR` si el texto no puede parsearse
 */
function parseMarketAnalysisResponse(text: string): MarketAnalysisOutput {
    const sentimentMatch = text.match(/sentimiento\s*[:\-]?\s*(ALCISTA|BAJISTA|NEUTRAL)/i);
    const soporteMatch   = text.match(/soporte\s*[:\-]?\s*([\d.,]+)/i);
    const resistMatch    = text.match(/resistencia\s*[:\-]?\s*([\d.,]+)/i);
    const justMatch      = text.match(/justificaci[oó]n\s*[:\-]?\s*(.+)/is);

    // Si no podemos extraer el sentimiento, el análisis no es confiable
    if (!sentimentMatch) {
        logger.warn('GroqAdapter: no se pudo parsear sentimiento de la respuesta', { preview: text.slice(0, 200) });
        throw new AiProviderError('PARSE_ERROR', 'La respuesta del modelo no pudo ser interpretada correctamente.');
    }

    return {
        raw:          text,
        sentiment:    sentimentMatch[1].toUpperCase() as MarketAnalysisOutput['sentiment'],
        soporte:      soporteMatch  ? soporteMatch[1]     : '-',
        resistencia:  resistMatch   ? resistMatch[1]      : '-',
        justificacion: justMatch    ? justMatch[1].trim() : text,
    };
}

// ─── Implementación del Adapter ────────────────────────────────────────────────

/**
 * Adapter concreto que conecta la interfaz `IAiProvider` con la API de Groq.
 *
 * @implements {IAiProvider}
 *
 * @example
 * // Uso via factory (recomendado — nunca instanciar directamente en controladores):
 * const aiProvider = AiProviderFactory.create();
 * const analysis = await aiProvider.analyzeCoin({ ... });
 */
export class GroqAdapter implements IAiProvider {
    readonly providerName = 'groq';

    /**
     * Envía un prompt a la API de Groq con reintentos y timeout.
     * Método privado — los consumidores usan `analyzeCoin` / `analyzeMarketData`.
     *
     * @param prompt - Texto del prompt a enviar al LLM
     * @param attempt - Número de intento actual (para backoff, uso interno)
     * @returns Respuesta de texto del modelo
     * @throws {AiProviderError} Si todos los reintentos fallan
     */
    private async callGroqApi(prompt: string, attempt = 0): Promise<string> {
        if (!env.GROQ_API_KEY) {
            throw new AiProviderError('API_KEY_MISSING', 'GROQ_API_KEY no está configurada en las variables de entorno.');
        }

        try {
            const response = await axios.post(
                GROQ_API_URL,
                {
                    model:    GROQ_MODEL,
                    messages: [{ role: 'user', content: prompt }],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
                        'Content-Type':  'application/json',
                    },
                    timeout: REQUEST_TIMEOUT_MS,
                    signal:  AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                }
            );

            const content: string | undefined = response.data?.choices?.[0]?.message?.content;
            if (typeof content !== 'string' || content.trim() === '') {
                throw new AiProviderError('PARSE_ERROR', 'El modelo devolvió una respuesta vacía o malformada.');
            }

            return content;

        } catch (err: unknown) {
            const classified = classifyError(err);

            // Solo reintentamos errores transitorios (no errores de autenticación o parseo)
            const isRetryable = classified.code === 'SERVICE_UNAVAILABLE' || classified.code === 'RATE_LIMIT_EXCEEDED';

            if (isRetryable && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt); // 500ms, 1000ms, 2000ms
                logger.warn(`GroqAdapter: reintento ${attempt + 1}/${MAX_RETRIES} en ${delay}ms`, {
                    code: classified.code,
                });
                await sleep(delay);
                return this.callGroqApi(prompt, attempt + 1);
            }

            throw classified;
        }
    }

    /**
     * @inheritdoc IAiProvider.analyzeCoin
     */
    async analyzeCoin(input: CoinAnalysisInput): Promise<string> {
        const prompt = [
            `Analiza el estado actual de ${input.coinName} (${input.coinSymbol}).`,
            `Precio actual: $${input.currentPrice}.`,
            `Cambio en 24h: ${input.change24h}%.`,
            `Proporciona un análisis breve (máximo 100 palabras) sobre si es un buen momento para`,
            `comprar, vender o mantener, basándote en la tendencia.`,
            `Responde en un tono profesional y directo en español.`,
        ].join(' ');

        logger.info('GroqAdapter.analyzeCoin: solicitud enviada', {
            provider: this.providerName,
            coin: input.coinSymbol,
            price: input.currentPrice,
        });

        const text = await this.callGroqApi(prompt);

        logger.info('GroqAdapter.analyzeCoin: análisis completado', {
            provider: this.providerName,
            coin: input.coinSymbol,
            responseLength: text.length,
        });

        return text;
    }

    /**
     * @inheritdoc IAiProvider.analyzeMarketData
     */
    async analyzeMarketData(input: MarketAnalysisInput): Promise<MarketAnalysisOutput> {
        const prompt = [
            'Eres un experto en análisis técnico de criptomonedas. Analiza estos datos de mercado:',
            `- Símbolo: ${input.symbol}`,
            `- Precio actual: $${input.price}`,
            `- Volumen 24h: ${input.volume}`,
            `- Cambio 24h: ${input.change24h}%`,
            '',
            'Responde EXACTAMENTE en este formato (sin markdown adicional, texto plano solamente):',
            'Sentimiento: [ALCISTA|BAJISTA|NEUTRAL]',
            'Soporte: [número]',
            'Resistencia: [número]',
            'Justificación: [2 frases técnicas concisas en español]',
        ].join('\n');

        logger.info('GroqAdapter.analyzeMarketData: solicitud enviada', {
            provider: this.providerName,
            symbol: input.symbol,
        });

        const text = await this.callGroqApi(prompt);

        logger.info('GroqAdapter.analyzeMarketData: análisis completado', {
            provider: this.providerName,
            symbol: input.symbol,
            responseLength: text.length,
        });

        return parseMarketAnalysisResponse(text);
    }
}
