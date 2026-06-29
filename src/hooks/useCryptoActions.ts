/**
 * @fileoverview useCryptoActions — Hook de acciones de negocio del usuario (trading, alertas, favoritos).
 *
 * RESPONSABILIDAD ÚNICA (SRP):
 * Encapsula TODAS las mutaciones de estado del usuario relacionadas con criptos:
 *   - `executeTrade`    → POST /users/buy o /users/sell
 *   - `toggleFavorite`  → POST /users/favorites
 *   - `createAlert`     → POST /users/alerts
 *
 * El componente `CryptoTable` ya no contiene lógica de negocio directa.
 * Solo pasa callbacks de este hook a los sub-componentes.
 *
 * MANEJO DE ERRORES:
 * Todos los errores se propagan como excepciones para que el componente
 * los maneje según su contexto de UI (toast, modal, etc.).
 *
 * @module hooks/useCryptoActions
 */

import { useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Crypto } from '../types/crypto';

// ─── Tipos ──────────────────────────────────────────────────────────────────────

/**
 * Parámetros para la acción de trading.
 */
export interface TradeParams {
    /** Criptomoneda a operar */
    coin: Crypto;
    /** Tipo de operación */
    type: 'buy' | 'sell';
    /** Cantidad de tokens */
    amount: number;
}

/**
 * Parámetros para crear una alerta de precio.
 */
export interface AlertParams {
    /** Criptomoneda para la alerta */
    coin: Crypto;
    /** Precio objetivo de la alerta */
    targetPrice: number;
}

export interface UseCryptoActionsReturn {
    /**
     * Ejecuta una operación de compra o venta.
     * @throws Si el servidor rechaza la operación (saldo insuficiente, etc.)
     */
    executeTrade: (params: TradeParams) => Promise<void>;
    /**
     * Añade o elimina una moneda de favoritos del usuario.
     * @throws Si el usuario no está autenticado o falla la petición
     */
    toggleFavorite: (coinId: string) => Promise<void>;
    /**
     * Crea una alerta de precio para una moneda.
     * @throws Si el servidor rechaza la alerta
     */
    createAlert: (params: AlertParams) => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook que provee acciones de negocio sobre criptomonedas.
 * Requiere que el usuario esté autenticado para todas las operaciones.
 *
 * @example
 * const { executeTrade, toggleFavorite, createAlert } = useCryptoActions();
 *
 * // En un handler:
 * await executeTrade({ coin, type: 'buy', amount: 0.5 });
 */
export function useCryptoActions(): UseCryptoActionsReturn {
    const { user, updateFavorites, updateUser } = useAuth();

    /**
     * Ejecuta una compra o venta de criptomoneda.
     * Actualiza el estado del usuario en AuthContext con los nuevos datos del wallet/portfolio.
     */
    const executeTrade = useCallback(async ({ coin, type, amount }: TradeParams): Promise<void> => {
        const { data } = await api.post(`/users/${type}`, {
            coinId: coin.id,
            symbol: coin.symbol,
            name:   coin.name,
            amount,
            price:  coin.current_price,
        });
        updateUser(data);
    }, [updateUser]);

    /**
     * Alterna el estado de favorito de una moneda para el usuario actual.
     * Actualiza el array de favoritos en AuthContext para reflejo inmediato en la UI.
     *
     * @throws {Error} Si el usuario no está autenticado
     */
    const toggleFavorite = useCallback(async (coinId: string): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        const { data } = await api.post('/users/favorites', { cryptoId: coinId });
        updateFavorites(data.favorites);
    }, [user, updateFavorites]);

    /**
     * Crea una alerta de precio.
     * La condición (above/below) se calcula automáticamente comparando
     * el precio objetivo con el precio actual de la moneda.
     *
     * @throws {Error} Si el usuario no está autenticado o la petición falla
     */
    const createAlert = useCallback(async ({ coin, targetPrice }: AlertParams): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        const condition = targetPrice > coin.current_price ? 'above' : 'below';
        const { data } = await api.post('/users/alerts', {
            coinId:      coin.id,
            symbol:      coin.symbol,
            condition,
            targetPrice,
        });
        updateUser({ ...user, alerts: data } as typeof user);
    }, [user, updateUser]);

    return { executeTrade, toggleFavorite, createAlert };
}
