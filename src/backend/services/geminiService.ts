/**
 * @fileoverview geminiService — Módulo de retrocompatibilidad.
 *
 * ⚠️  DEPRECADO: Este archivo existe únicamente para mantener compatibilidad
 * con cualquier import legacy que pudiera existir en el codebase.
 *
 * MIGRACIÓN:
 *  - Para uso en controladores → usa `AiProviderFactory.getProvider()` (inyección de dependencias)
 *  - Para tipos compartidos   → importa desde `adapters/ai/IAiProvider.ts`
 *  - Para llamadas directas   → instancia `GroqAdapter` directamente (casos de uso de testing)
 *
 * Este archivo será eliminado en la próxima versión mayor.
 *
 * @deprecated Usar AiProviderFactory en su lugar.
 * @module services/geminiService
 */

export type {
    CoinAnalysisInput,
    MarketAnalysisInput,
    MarketAnalysisOutput,
} from '../adapters/ai/IAiProvider.js';

export { AiProviderFactory as default } from '../adapters/ai/AiProviderFactory.js';

/**
 * @deprecated Usar `AiProviderFactory.getProvider().analyzeCoin()` en su lugar.
 */
export async function analyzeCoin(
    input: import('../adapters/ai/IAiProvider.js').CoinAnalysisInput
): Promise<string> {
    const { AiProviderFactory } = await import('../adapters/ai/AiProviderFactory.js');
    return AiProviderFactory.getProvider().analyzeCoin(input);
}

/**
 * @deprecated Usar `AiProviderFactory.getProvider().analyzeMarketData()` en su lugar.
 */
export async function analyzeMarketData(
    input: import('../adapters/ai/IAiProvider.js').MarketAnalysisInput
): Promise<import('../adapters/ai/IAiProvider.js').MarketAnalysisOutput> {
    const { AiProviderFactory } = await import('../adapters/ai/AiProviderFactory.js');
    return AiProviderFactory.getProvider().analyzeMarketData(input);
}
