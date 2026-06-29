/**
 * @fileoverview Tipos de dominio del módulo de Perfil de Usuario.
 *
 * Centraliza todos los tipos usados por los hooks y componentes de la página
 * de perfil. Elimina el uso de `any` en operaciones de datos del usuario.
 *
 * @module types/user
 */

// ─── Entidades de dominio ──────────────────────────────────────────────────────

/**
 * Perfil completo del usuario tal como devuelve GET /api/users/profile.
 * Excluye campos sensibles (password, securityPin) — el servidor nunca los devuelve.
 */
export interface UserProfile {
    _id:         string;
    email:       string;
    fullName:    string;
    age:         number;
    country:     string;
    phoneNumber: string;
    birthDate:   string;   // ISO string — convertir a Date al formatear
    favorites:   string[];
    wallet:      number;
    portfolio:   PortfolioItem[];
    alerts:      PriceAlert[];
    createdAt:   string;   // ISO string
    updatedAt:   string;
}

/**
 * Ítem del portfolio del usuario.
 * Espeja `IPortfolioItem` del backend.
 */
export interface PortfolioItem {
    coinId:       string;
    symbol:       string;
    amount:       number;
    averagePrice: number;
}

/**
 * Alerta de precio activa del usuario.
 */
export interface PriceAlert {
    id:          string;
    coinId:      string;
    symbol:      string;
    condition:   'above' | 'below';
    targetPrice: number;
    active:      boolean;
}

/**
 * Registro de transacción del historial de operaciones.
 * Espeja `ITransaction` del backend.
 */
export interface Transaction {
    _id:       string;
    userId:    string;
    type:      'buy' | 'sell';
    coinId:    string;
    symbol:    string;
    name:      string;
    amount:    number;
    price:     number;
    totalUSD:  number;
    createdAt: string;  // ISO string
}

// ─── Tipos de estado de los modales ───────────────────────────────────────────

/** Tipo discriminado para los modales de acción del perfil */
export type ProfileModalType = 'edit' | 'password' | null;

/**
 * Datos editables del formulario de perfil.
 * Subconjunto de UserProfile — solo los campos que el usuario puede modificar.
 */
export interface EditProfileData {
    fullName:    string;
    phoneNumber: string;
    country:     string;
}

// ─── Métricas del portfolio ────────────────────────────────────────────────────

/**
 * Métricas calculadas del portfolio del usuario.
 * Devueltas por el hook `usePortfolioMetrics`.
 */
export interface PortfolioMetrics {
    /** Valor total del portfolio en USD (suma de amount × averagePrice de cada activo) */
    totalValue:      number;
    /** Número de activos distintos en posesión */
    uniqueAssets:    number;
    /** El activo con mayor posición por valor en USD */
    topAsset:        PortfolioItem | null;
}
