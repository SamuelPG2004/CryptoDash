/**
 * @fileoverview usePortfolioMetrics — Hook de cálculo de métricas del portfolio.
 *
 * RESPONSABILIDAD ÚNICA:
 *  Calcula métricas derivadas del portfolio del usuario.
 *  Son funciones puras aplicadas sobre los datos del perfil — sin llamadas de red.
 *
 * PREPARACIÓN PARA PRECIOS EN TIEMPO REAL:
 *  Actualmente usa `averagePrice` (precio de compra) como base de cálculo.
 *  Cuando se integre el WebSocket de precios en tiempo real, solo este hook
 *  necesita recibir los precios actuales como parámetro adicional para calcular
 *  P&L (Profit & Loss) real — el componente Profile no cambia.
 *
 * @module hooks/usePortfolioMetrics
 */

import { useMemo } from 'react';
import type { PortfolioItem, PortfolioMetrics } from '../types/user';

/**
 * Calcula métricas del portfolio del usuario a partir de sus posiciones.
 *
 * @param portfolio - Lista de ítems del portfolio
 * @returns Métricas calculadas (memoizadas)
 *
 * @example
 * const { totalValue, uniqueAssets, topAsset } = usePortfolioMetrics(profile.portfolio);
 */
export function usePortfolioMetrics(portfolio: PortfolioItem[]): PortfolioMetrics {
    return useMemo<PortfolioMetrics>(() => {
        if (!portfolio || portfolio.length === 0) {
            return { totalValue: 0, uniqueAssets: 0, topAsset: null };
        }

        // Valor total: suma de (amount × averagePrice) para cada activo
        const totalValue = portfolio.reduce(
            (acc, item) => acc + item.amount * item.averagePrice,
            0,
        );

        // Activo con mayor peso por valor absoluto en USD
        const topAsset = portfolio.reduce<PortfolioItem | null>((best, item) => {
            const itemValue = item.amount * item.averagePrice;
            const bestValue = best ? best.amount * best.averagePrice : -Infinity;
            return itemValue > bestValue ? item : best;
        }, null);

        return {
            totalValue,
            uniqueAssets: portfolio.length,
            topAsset,
        };
    }, [portfolio]);
}
