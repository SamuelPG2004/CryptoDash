/**
 * @fileoverview AiProviderFactory — Fábrica de proveedores de IA con Inyección de Dependencias.
 *
 * PATRÓN APLICADO: Factory + Singleton por proceso.
 * El controlador nunca sabe qué proveedor concreto está usando.
 * Cambiar de Groq a OpenAI requiere solo cambiar `AI_PROVIDER` en `.env`.
 *
 * PROVEEDORES DISPONIBLES:
 *  - `groq`   → GroqAdapter (activo por defecto si GROQ_API_KEY está presente)
 *  - `openai` → OpenAiAdapter (stub — requiere implementación y licencia)
 *  - `mock`   → MockAiAdapter (sin llamadas de red, para testing y demos)
 *
 * VARIABLES DE ENTORNO:
 *  - `AI_PROVIDER` — Nombre del proveedor a usar (default: 'groq')
 *  - `GROQ_API_KEY` — Obligatoria si AI_PROVIDER=groq
 *  - `OPENAI_API_KEY` — Obligatoria si AI_PROVIDER=openai (futuro)
 *
 * @module adapters/ai/AiProviderFactory
 */

import { IAiProvider } from './IAiProvider.js';
import { GroqAdapter } from './GroqAdapter.js';
import { MockAiAdapter } from './MockAiAdapter.js';
import { OpenAiAdapter } from './OpenAiAdapter.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/** Tipo que representa los nombres de proveedores registrados */
type AiProviderName = 'groq' | 'openai' | 'mock';

/**
 * Registro de proveedores disponibles.
 * Para agregar un nuevo proveedor, solo añade una entrada aquí y crea el Adapter.
 * No es necesario modificar ningún controlador ni servicio de negocio.
 */
const PROVIDER_REGISTRY: Record<AiProviderName, () => IAiProvider> = {
    groq:   () => new GroqAdapter(),
    openai: () => new OpenAiAdapter(),
    mock:   () => new MockAiAdapter(),
};

/**
 * Instancia singleton del proveedor activo.
 * Se inicializa en el primer llamado a `AiProviderFactory.getProvider()`.
 */
let activeProvider: IAiProvider | null = null;

/**
 * Fábrica que resuelve y cachea el proveedor de IA activo.
 *
 * @example
 * // En el controlador:
 * const aiProvider = AiProviderFactory.getProvider();
 * const analysis = await aiProvider.analyzeCoin(input);
 */
export class AiProviderFactory {
    private constructor() {} // Previene instanciación directa

    /**
     * Retorna el proveedor de IA activo (singleton por proceso).
     *
     * Lógica de resolución:
     *  1. Usa `AI_PROVIDER` de variables de entorno si está definida
     *  2. Si no hay API Key de Groq en entorno no-productivo → usa `mock` automáticamente
     *  3. Por defecto: `groq`
     *
     * @returns Instancia del proveedor de IA activo
     * @throws {Error} Si el nombre de proveedor en `AI_PROVIDER` no está registrado
     */
    static getProvider(): IAiProvider {
        if (activeProvider) return activeProvider;

        const requestedProvider = (process.env.AI_PROVIDER ?? 'groq').toLowerCase() as AiProviderName;

        // Auto-fallback a mock en desarrollo si no hay API Key
        const resolvedName: AiProviderName =
            requestedProvider === 'groq' && !env.GROQ_API_KEY && env.NODE_ENV !== 'production'
                ? 'mock'
                : requestedProvider;

        const factory = PROVIDER_REGISTRY[resolvedName];

        if (!factory) {
            const available = Object.keys(PROVIDER_REGISTRY).join(', ');
            throw new Error(
                `AI_PROVIDER='${requestedProvider}' no está registrado. Disponibles: ${available}`
            );
        }

        activeProvider = factory();

        logger.info('AiProviderFactory: proveedor de IA inicializado', {
            requested: requestedProvider,
            resolved:  resolvedName,
            provider:  activeProvider.providerName,
        });

        return activeProvider;
    }

    /**
     * Reemplaza el proveedor activo. Usado principalmente en tests para inyectar mocks.
     *
     * @example
     * // En tests:
     * AiProviderFactory.setProvider(new MockAiAdapter());
     *
     * @param provider - Instancia de IAiProvider a usar
     */
    static setProvider(provider: IAiProvider): void {
        activeProvider = provider;
        logger.info('AiProviderFactory: proveedor reemplazado manualmente', {
            provider: provider.providerName,
        });
    }

    /**
     * Resetea el singleton. Útil en tests para asegurar aislamiento entre suites.
     */
    static reset(): void {
        activeProvider = null;
    }
}
