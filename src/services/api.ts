/**
 * @fileoverview api — Instancia de Axios configurada para CryptoDash.
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  CAPA DE SEGURIDAD: Interceptor de Sesión Expirada                         ║
 * ║                                                                              ║
 * ║  El interceptor de respuesta maneja 401 Unauthorized globalmente:           ║
 * ║                                                                              ║
 * ║  1. Limpia el JWT del storage (tokenStorage.removeToken)                    ║
 * ║  2. Cancela todas las requests pendientes (AbortController pattern)         ║
 * ║  3. Emite el evento global 'auth:session-expired' para que                  ║
 * ║     AuthContext limpie el estado React sin crear dependencias circulares.   ║
 * ║  4. Redirige a /login                                                       ║
 * ║                                                                              ║
 * ║  Por qué eventos en lugar de importar AuthContext directamente:             ║
 * ║  - AuthContext importa api → api importaría AuthContext = ciclo circular    ║
 * ║  - El patrón de evento desacopla completamente las capas                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module services/api
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getToken, removeToken } from '../lib/tokenStorage';

// ─── Nombre canónico del evento de sesión expirada ────────────────────────────

/**
 * Nombre del CustomEvent emitido cuando el servidor devuelve 401.
 * AuthContext lo escucha para limpiar el estado React y redirigir al login.
 *
 * @example
 * window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
 */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired' as const;

// ─── Instancia de Axios ────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: '/api',
    timeout: 15_000,  // 15 segundos — previene requests colgados indefinidamente
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Interceptor de Request — inyección de JWT ────────────────────────────────

/**
 * Adjunta el JWT de autorización a cada request saliente.
 * Si no hay token, la request sale sin header Authorization
 * (endpoints públicos como /prices no lo necesitan).
 */
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: unknown) => Promise.reject(error),
);

// ─── Interceptor de Response — manejo global de errores ───────────────────────

/**
 * Indicador para evitar múltiples limpiezas de sesión concurrentes.
 * Si tres requests fallan con 401 simultáneamente, solo la primera actúa.
 */
let isHandlingUnauthorized = false;

api.interceptors.response.use(
    response => response,

    (error: AxiosError): Promise<never> => {
        const status = error.response?.status;

        // ── 401 Unauthorized — Sesión expirada o token inválido ─────────────
        if (status === 401 && !isHandlingUnauthorized) {
            isHandlingUnauthorized = true;

            // 1. Limpiar el token del storage (única fuente de verdad)
            removeToken();

            // 2. Notificar a AuthContext para que limpie el estado React
            //    (sin importar AuthContext directamente — evita ciclo circular)
            window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

            // 3. Redirigir al login (usando window.location para romper el contexto de React)
            //    Delay mínimo para que AuthContext procese el evento antes del redirect
            setTimeout(() => {
                window.location.href = '/login';
                isHandlingUnauthorized = false;
            }, 100);
        }

        // ── 500 Internal Server Error — log de diagnóstico ──────────────────
        if (status === 500) {
            const detail = (error.response?.data as { message?: string })?.message;
            console.error('[API] Error 500 del servidor:', detail ?? error.message);
        }

        return Promise.reject(error);
    },
);

export default api;
