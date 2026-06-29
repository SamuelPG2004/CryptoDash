/**
 * @fileoverview technicalIndicators — Funciones puras de análisis técnico.
 *
 * PRINCIPIO: Funciones puras sin efectos secundarios — 100% testeables con Jest
 * sin necesidad de mockear ninguna dependencia.
 *
 * Extraídas del componente `CryptoTable.tsx` original donde vivían mezcladas
 * con la lógica de UI. Ahora son independientes y reutilizables por cualquier
 * componente o hook del proyecto.
 *
 * @module lib/technicalIndicators
 */

// ─── Simple Moving Average ─────────────────────────────────────────────────────

/**
 * Calcula la Media Móvil Simple (SMA) de los últimos `period` precios.
 *
 * @param prices - Array de precios históricos (orden cronológico ascendente)
 * @param period - Número de períodos para el cálculo (e.g. 20 para SMA-20)
 * @returns El valor de la SMA, o `null` si hay datos insuficientes
 *
 * @example
 * calculateSMA([100, 110, 105, 115, 120], 3) // → 113.33
 * calculateSMA([100, 110], 5)                // → null (insuficientes)
 */
export function calculateSMA(prices: number[], period: number): number | null {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const sum   = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
}

// ─── Relative Strength Index ───────────────────────────────────────────────────

/**
 * Calcula el Índice de Fuerza Relativa (RSI) de los últimos `period` períodos.
 *
 * El RSI oscila entre 0 y 100:
 * - RSI > 70: Activo potencialmente sobrecomprado (señal bajista)
 * - RSI < 30: Activo potencialmente sobrevendido (señal alcista)
 * - RSI 30-70: Zona neutral
 *
 * Implementación: método de media simple (Wilder's no-smoothed, adecuado para
 * sparklines de corto plazo con pocos datos).
 *
 * @param prices - Array de precios históricos (mínimo `period + 1` elementos)
 * @param period - Número de períodos (default: 14, estándar de la industria)
 * @returns RSI redondeado al entero más cercano, o `null` si hay datos insuficientes
 *
 * @example
 * // Con 20 precios y period=14:
 * calculateRSI(prices, 14) // → e.g. 62 (zona neutral)
 *
 * // Con datos insuficientes:
 * calculateRSI([100, 110], 14) // → null
 */
export function calculateRSI(prices: number[], period = 14): number | null {
    if (prices.length < period + 1) return null;

    // Calculamos los cambios de precio para los últimos `period` períodos
    const recentPrices = prices.slice(-(period + 1));
    const changes = recentPrices
        .map((price, i, arr) => (i === 0 ? null : price - arr[i - 1]))
        .filter((v): v is number => v !== null);

    const gains  = changes.filter((c) => c > 0);
    const losses = changes.filter((c) => c < 0).map(Math.abs);

    const avgGain = gains.reduce((acc, g) => acc + g, 0) / period;
    const avgLoss = losses.reduce((acc, l) => acc + l, 0) / period;

    // Si no hay pérdidas, el RSI es 100 (fuerza total — mercado solo subió)
    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return Math.round(100 - 100 / (1 + rs));
}

// ─── Interpretaciones ──────────────────────────────────────────────────────────

/**
 * Devuelve la etiqueta de interpretación del RSI.
 *
 * @param rsi - Valor de RSI entre 0 y 100
 * @returns Etiqueta de zona del RSI
 */
export function interpretRSI(rsi: number): 'sobrecomprado' | 'sobrevendido' | 'neutral' {
    if (rsi > 70) return 'sobrecomprado';
    if (rsi < 30) return 'sobrevendido';
    return 'neutral';
}
