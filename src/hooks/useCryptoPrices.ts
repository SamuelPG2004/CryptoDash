/**
 * @fileoverview useCryptoPrices — Hook de fetching y polling de precios de mercado.
 *
 * RESPONSABILIDAD ÚNICA (SRP):
 * Este hook encapsula TODO lo relacionado con obtener datos de precios:
 *   - Llamada inicial al montar
 *   - Polling cada 5 minutos (alineado con el caché del backend)
 *   - Transformación de la respuesta cruda al tipo `Crypto`
 *   - Manejo de estados: loading, error, data
 *
 * El componente `CryptoTable` ya no contiene lógica de fetching.
 * Consume este hook y se limita a renderizar.
 *
 * SEGURIDAD:
 * - Cancela el polling al desmontar (cleanup de useEffect)
 * - No expone tokens ni credenciales — usa la instancia `api` con interceptor JWT
 *
 * @module hooks/useCryptoPrices
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { Crypto, RawCryptoApiItem } from '../types/crypto';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Intervalo de polling en ms — alineado con el TTL del caché del backend */
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// ─── Transformaciones ──────────────────────────────────────────────────────────

/**
 * Transforma un ítem crudo de la API al tipo de dominio `Crypto`.
 * Centraliza el mapeo para que si la API cambia, solo este punto necesita actualización.
 *
 * @param item - Ítem crudo de la respuesta de /api/crypto/prices
 * @returns Objeto `Crypto` normalizado
 */
function mapApiItemToCrypto(item: RawCryptoApiItem): Crypto {
    return {
        id:                          item.id,
        symbol:                      item.symbol,
        name:                        item.name      ?? item.id,
        current_price:               item.price     ?? 0,
        price_change_percentage_24h: item.change    ?? 0,
        image:                       item.image     ?? '',
        sparkline:                   item.sparkline ?? [],
        total_volume:                item.volume    ?? 0,
    };
}

// ─── Tipos del hook ────────────────────────────────────────────────────────────

export interface UseCryptoPricesReturn {
    /** Lista de criptomonedas con datos de mercado actualizados */
    cryptos: Crypto[];
    /** `true` únicamente durante la carga inicial (sin datos previos) */
    loading: boolean;
    /** Mensaje de error si la última solicitud falló. `null` si no hay error. */
    error: string | null;
    /** Fuerza una actualización manual fuera del ciclo de polling */
    refetch: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook que provee precios de mercado en tiempo real con polling automático.
 *
 * @example
 * const { cryptos, loading, error } = useCryptoPrices();
 *
 * @returns Estado del fetch y la lista de criptomonedas normalizadas
 */
export function useCryptoPrices(): UseCryptoPricesReturn {
    const [cryptos, setCryptos] = useState<Crypto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    const fetchPrices = useCallback(async (signal?: AbortSignal) => {
        try {
            const { data } = await api.get<RawCryptoApiItem[]>('/crypto/prices', { signal });

            const normalized = data
                .filter((item): item is RawCryptoApiItem => !!(item?.id && item?.symbol))
                .map(mapApiItemToCrypto);

            setCryptos(normalized);
            setError(null);
        } catch (err: unknown) {
            // Un abort no es un error real: el componente se desmontó o llegó
            // una request más reciente — no tocar el estado.
            if (signal?.aborted) return;
            const message = err instanceof Error ? err.message : 'Error desconocido';
            console.error('[useCryptoPrices] Error al obtener precios:', message);
            setError('No se pudieron cargar los datos del mercado. Reintentando...');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        // AbortController: cancela la request en vuelo al desmontar y evita
        // que una respuesta antigua pise a una más reciente (out-of-order).
        const controller = new AbortController();
        fetchPrices(controller.signal);
        const interval = setInterval(() => fetchPrices(controller.signal), POLL_INTERVAL_MS);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [fetchPrices]);

    return { cryptos, loading, error, refetch: () => fetchPrices() };
}
