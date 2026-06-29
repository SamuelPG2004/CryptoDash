/**
 * @fileoverview OpenAiAdapter — Adapter DUMMY para futura integración con OpenAI GPT-4.
 *
 * ⚠️  ESTADO: STUB — No funcional. Requiere licencia comercial de OpenAI.
 *
 * INSTRUCCIONES DE ACTIVACIÓN (cuando el cliente adquiera la licencia):
 *  1. Instala el SDK oficial: `npm install openai`
 *  2. Agrega `OPENAI_API_KEY=sk-...` a las variables de entorno
 *  3. Agrega `OPENAI_ORG_ID=org-...` (opcional, para cuentas de organización)
 *  4. Implementa los métodos `analyzeCoin` y `analyzeMarketData` usando el SDK
 *  5. Registra el adapter en `AiProviderFactory` con el nombre `'openai'`
 *  6. Establece `AI_PROVIDER=openai` en `.env`
 *  7. ✅ Cero cambios en controladores ni en lógica de negocio.
 *
 * REFERENCIA DE IMPLEMENTACIÓN:
 *  @see https://platform.openai.com/docs/api-reference/chat
 *  @see GroqAdapter.ts — Misma estructura, cambiar cliente HTTP por el SDK de OpenAI
 *
 * @module adapters/ai/OpenAiAdapter
 */

import {
    IAiProvider,
    CoinAnalysisInput,
    MarketAnalysisInput,
    MarketAnalysisOutput,
    AiProviderError,
} from './IAiProvider.js';

/**
 * Adapter stub para OpenAI GPT-4.
 * Implementa la interfaz `IAiProvider` pero lanza un error controlado
 * hasta que el cliente adquiera la licencia y se complete la implementación.
 *
 * @implements {IAiProvider}
 * @todo Implementar con SDK oficial de OpenAI cuando la licencia esté activa.
 */
export class OpenAiAdapter implements IAiProvider {
    readonly providerName = 'openai';

    /**
     * @throws {AiProviderError} SERVICE_UNAVAILABLE — Adapter no implementado.
     */
    async analyzeCoin(_input: CoinAnalysisInput): Promise<string> {
        throw new AiProviderError(
            'SERVICE_UNAVAILABLE',
            'OpenAI adapter está configurado pero pendiente de implementación. ' +
            'Contacta al equipo de desarrollo para activar la integración.'
        );
    }

    /**
     * @throws {AiProviderError} SERVICE_UNAVAILABLE — Adapter no implementado.
     */
    async analyzeMarketData(_input: MarketAnalysisInput): Promise<MarketAnalysisOutput> {
        throw new AiProviderError(
            'SERVICE_UNAVAILABLE',
            'OpenAI adapter está configurado pero pendiente de implementación. ' +
            'Contacta al equipo de desarrollo para activar la integración.'
        );
    }
}

// ─── PLANTILLA DE IMPLEMENTACIÓN FUTURA ──────────────────────────────────────
//
// import OpenAI from 'openai'; // npm install openai
// import { env } from '../../config/env.js';
//
// export class OpenAiAdapter implements IAiProvider {
//     readonly providerName = 'openai';
//     private readonly client: OpenAI;
//
//     constructor() {
//         this.client = new OpenAI({
//             apiKey:       env.OPENAI_API_KEY,
//             organization: env.OPENAI_ORG_ID,
//             timeout:      15_000,
//             maxRetries:   2,
//         });
//     }
//
//     async analyzeCoin(input: CoinAnalysisInput): Promise<string> {
//         const response = await this.client.chat.completions.create({
//             model:    'gpt-4o',
//             messages: [{ role: 'user', content: buildCoinPrompt(input) }],
//         });
//         return response.choices[0].message.content ?? '';
//     }
//
//     async analyzeMarketData(input: MarketAnalysisInput): Promise<MarketAnalysisOutput> {
//         const response = await this.client.chat.completions.create({
//             model:       'gpt-4o',
//             messages:    [{ role: 'user', content: buildMarketPrompt(input) }],
//             response_format: { type: 'json_object' }, // GPT-4o puede devolver JSON estructurado
//         });
//         return parseMarketResponse(response.choices[0].message.content ?? '');
//     }
// }
