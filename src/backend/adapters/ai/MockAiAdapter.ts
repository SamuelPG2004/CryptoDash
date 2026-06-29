/**
 * @fileoverview MockAiAdapter — Adapter dummy para desarrollo, testing y demos sin API Key.
 *
 * CASOS DE USO:
 *  - Entornos CI/CD donde no hay GROQ_API_KEY disponible
 *  - Tests unitarios que no deben hacer llamadas de red reales
 *  - Demos al cliente cuando la licencia de API paga aún no está activa
 *  - Desarrollo local sin consumir cuota de la API
 *
 * ACTIVACIÓN:
 *  Establece `AI_PROVIDER=mock` en `.env` o el `AiProviderFactory` lo activa
 *  automáticamente si `GROQ_API_KEY` no está presente en entornos no-productivos.
 *
 * IMPORTANTE: Este adapter NUNCA debe activarse en producción con datos reales.
 *
 * @module adapters/ai/MockAiAdapter
 */

import {
    IAiProvider,
    CoinAnalysisInput,
    MarketAnalysisInput,
    MarketAnalysisOutput,
} from './IAiProvider.js';

/**
 * Adapter dummy que implementa `IAiProvider` con respuestas mock deterministas.
 * No realiza ninguna llamada de red. Ideal para pruebas y desarrollo.
 *
 * @implements {IAiProvider}
 */
export class MockAiAdapter implements IAiProvider {
    readonly providerName = 'mock';

    /**
     * Devuelve un análisis mock determinista basado en el cambio de precio.
     * La lógica simula un comportamiento real para que los tests sean significativos.
     *
     * @param input - Datos de la moneda
     * @returns Análisis simulado en español
     */
    async analyzeCoin(input: CoinAnalysisInput): Promise<string> {
        const trend = input.change24h > 2
            ? 'tendencia alcista moderada'
            : input.change24h < -2
                ? 'tendencia bajista'
                : 'movimiento lateral';

        const recommendation = input.change24h > 5
            ? 'considerar toma de ganancias parciales'
            : input.change24h < -5
                ? 'esperar confirmación antes de nuevas entradas'
                : 'mantener posición actual';

        return (
            `[MODO DEMO] ${input.coinName} (${input.coinSymbol}) presenta una ${trend} ` +
            `con precio actual de $${input.currentPrice} y una variación de ${input.change24h}% ` +
            `en las últimas 24 horas. Se recomienda ${recommendation}. ` +
            `Este análisis es generado por el adaptador de demostración.`
        );
    }

    /**
     * Devuelve un análisis técnico mock con valores derivados del precio actual.
     * Los niveles de soporte y resistencia se calculan como ±3% y ±5% del precio.
     *
     * @param input - Datos de mercado
     * @returns Análisis técnico estructurado simulado
     */
    async analyzeMarketData(input: MarketAnalysisInput): Promise<MarketAnalysisOutput> {
        const sentiment: MarketAnalysisOutput['sentiment'] =
            input.change24h > 2 ? 'ALCISTA' :
            input.change24h < -2 ? 'BAJISTA' : 'NEUTRAL';

        const soporte     = (input.price * 0.97).toFixed(2);
        const resistencia = (input.price * 1.05).toFixed(2);

        const justificacion = [
            `[DEMO] El activo ${input.symbol} opera en zona de ${sentiment.toLowerCase()} `,
            `con soporte técnico en $${soporte} y resistencia en $${resistencia}. `,
            `Volumen de $${input.volume.toLocaleString()} confirma la tendencia actual.`,
        ].join('');

        return {
            sentiment,
            soporte,
            resistencia,
            justificacion,
            raw: `[MockAiAdapter] Respuesta simulada para ${input.symbol} a $${input.price}`,
        };
    }
}
