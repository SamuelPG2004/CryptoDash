/**
 * @fileoverview IAiProvider — Interfaz central del Patrón Adapter para proveedores de IA.
 *
 * PRINCIPIO APLICADO: Dependency Inversion Principle (DIP) de SOLID.
 * Los módulos de alto nivel (controladores, servicios de negocio) dependen
 * de esta abstracción, nunca de implementaciones concretas (Groq, OpenAI, etc.).
 *
 * GUÍA DE INTEGRACIÓN FUTURA (plug-and-play):
 *   1. Crea un nuevo archivo: `src/backend/adapters/ai/<NuevoProveedor>Adapter.ts`
 *   2. Implementa la interfaz `IAiProvider`
 *   3. Registra el nuevo proveedor en `AiProviderFactory`
 *   4. Cambia `AI_PROVIDER=nuevo_proveedor` en `.env`
 *   5. ✅ Cero cambios en controladores ni en lógica de negocio.
 *
 * @module adapters/ai/IAiProvider
 */

// ─── Shared Domain Types ──────────────────────────────────────────────────────

/**
 * Input para el análisis simple de una criptomoneda.
 */
export interface CoinAnalysisInput {
    /** Nombre completo de la moneda (e.g. "Bitcoin") */
    coinName: string;
    /** Símbolo ticker (e.g. "BTC") */
    coinSymbol: string;
    /** Precio actual en USD */
    currentPrice: number;
    /** Variación porcentual en las últimas 24 horas */
    change24h: number;
}

/**
 * Input para el análisis técnico completo de mercado.
 */
export interface MarketAnalysisInput {
    /** Símbolo ticker (e.g. "ETH") */
    symbol: string;
    /** Precio actual en USD */
    price: number;
    /** Volumen de trading en las últimas 24 horas */
    volume: number;
    /** Variación porcentual en las últimas 24 horas */
    change24h: number;
}

/**
 * Resultado estructurado del análisis técnico de mercado.
 * Este tipo es el contrato entre backend y frontend — no debe cambiar
 * independientemente del proveedor de IA que se use.
 */
export interface MarketAnalysisOutput {
    /** Sentimiento de mercado detectado */
    sentiment: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL';
    /** Nivel de soporte estimado */
    soporte: string;
    /** Nivel de resistencia estimado */
    resistencia: string;
    /** Justificación técnica del análisis */
    justificacion: string;
    /** Respuesta cruda del modelo (para debugging/auditoría) */
    raw: string;
}

// ─── Error discriminado para el dominio de IA ─────────────────────────────────

/**
 * Códigos de error tipados para el dominio de IA.
 * Reemplaza el frágil patrón `error.message.includes('...')` del código original.
 */
export type AiErrorCode =
    | 'API_KEY_MISSING'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SERVICE_UNAVAILABLE'
    | 'PARSE_ERROR'
    | 'UNKNOWN_ERROR';

/**
 * Error operacional del dominio de IA con código discriminado.
 * Permite a los controladores hacer `switch (err.code)` de forma segura.
 */
export class AiProviderError extends Error {
    /** @readonly Código de error tipado para manejo discriminado */
    readonly code: AiErrorCode;
    /** @readonly Status HTTP recomendado para la respuesta */
    readonly httpStatus: number;

    constructor(code: AiErrorCode, message: string) {
        super(message);
        this.name = 'AiProviderError';
        this.code = code;
        this.httpStatus = AiProviderError.resolveHttpStatus(code);
        Error.captureStackTrace(this, this.constructor);
    }

    private static resolveHttpStatus(code: AiErrorCode): number {
        const statusMap: Record<AiErrorCode, number> = {
            API_KEY_MISSING:      503,
            RATE_LIMIT_EXCEEDED:  429,
            SERVICE_UNAVAILABLE:  503,
            PARSE_ERROR:          500,
            UNKNOWN_ERROR:        500,
        };
        return statusMap[code];
    }
}

// ─── Contrato del Adapter ──────────────────────────────────────────────────────

/**
 * Interfaz que todos los proveedores de IA deben implementar.
 *
 * @example
 * // Implementación de un nuevo proveedor:
 * export class OpenAiAdapter implements IAiProvider {
 *     readonly providerName = 'openai';
 *     async analyzeCoin(input: CoinAnalysisInput): Promise<string> { ... }
 *     async analyzeMarketData(input: MarketAnalysisInput): Promise<MarketAnalysisOutput> { ... }
 * }
 */
export interface IAiProvider {
    /** Identificador del proveedor (usado en logs y métricas) */
    readonly providerName: string;

    /**
     * Genera un análisis breve de compra/venta/mantener para una moneda.
     * @param input - Datos de la moneda a analizar
     * @returns Texto del análisis en español
     * @throws {AiProviderError} Si la API falla o supera límites
     */
    analyzeCoin(input: CoinAnalysisInput): Promise<string>;

    /**
     * Genera un análisis técnico estructurado con sentimiento, soporte y resistencia.
     * @param input - Datos de mercado para analizar
     * @returns Objeto de análisis estructurado
     * @throws {AiProviderError} Si la API falla, supera límites o no puede parsear
     */
    analyzeMarketData(input: MarketAnalysisInput): Promise<MarketAnalysisOutput>;
}
