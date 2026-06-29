/**
 * @fileoverview Tipos de dominio compartidos para el módulo de Criptomonedas.
 *
 * PRINCIPIO: Single Source of Truth para el contrato de datos entre
 * API backend → hooks → componentes.
 *
 * Estos tipos son la "capa de dominio" del frontend. Si la API cambia,
 * solo este archivo necesita actualizarse.
 *
 * @module types/crypto
 */

// ─── Entidades de dominio ──────────────────────────────────────────────────────

/**
 * Representa una criptomoneda con datos de mercado en tiempo real.
 * Mapeada desde la respuesta de GET /api/crypto/prices.
 */
export interface Crypto {
    /** Identificador único (slug de CoinGecko, e.g. "bitcoin") */
    id: string;
    /** Símbolo ticker en mayúsculas (e.g. "BTC") */
    symbol: string;
    /** Nombre completo (e.g. "Bitcoin") */
    name: string;
    /** Precio actual en USD */
    current_price: number;
    /** Variación porcentual en las últimas 24 horas */
    price_change_percentage_24h: number;
    /** URL de la imagen del logo */
    image: string;
    /** Array de precios históricos para el sparkline (últimas ~168 horas) */
    sparkline: number[];
}

/**
 * Punto de datos para el gráfico de área (formato requerido por Recharts).
 */
export interface ChartDataPoint {
    /** Índice del punto en la serie temporal */
    time: number;
    /** Precio en USD en ese punto */
    price: number;
}

/**
 * Indicadores técnicos calculados a partir del sparkline.
 */
export interface TechnicalIndicators {
    /** Simple Moving Average de 20 períodos. `null` si hay datos insuficientes. */
    sma: number | null;
    /** Relative Strength Index de 14 períodos (0-100). `null` si hay datos insuficientes. */
    rsi: number | null;
}

/**
 * Elemento de un item del portfolio del usuario.
 * Tipado estricto — reemplaza el `any` del código original.
 */
export interface PortfolioItem {
    /** ID de la moneda (e.g. "bitcoin") */
    coinId: string;
    /** Símbolo ticker */
    symbol: string;
    /** Cantidad de tokens en posesión */
    amount: number;
    /** Precio promedio de compra (puede no estar presente en datos legacy) */
    avgBuyPrice?: number;
}

/**
 * Estado del modal de trading.
 */
export interface TradeModalState {
    open: boolean;
    type: 'buy' | 'sell';
}

// ─── Respuestas de API ──────────────────────────────────────────────────────────

/**
 * Respuesta cruda de GET /api/crypto/prices (antes del mapeo).
 * Usada internamente por `useCryptoPrices` para la transformación.
 *
 * @internal
 */
export interface RawCryptoApiItem {
    id: string;
    symbol: string;
    name?: string;
    price?: number;
    change?: number;
    image?: string;
    sparkline?: number[];
}
