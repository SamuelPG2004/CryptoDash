/**
 * @fileoverview AuthContext — Contexto global de autenticación de CryptoDash.
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  AUDITORÍA DE SEGURIDAD — Cambios aplicados                                ║
 * ║                                                                              ║
 * ║  1. ALMACENAMIENTO DE TOKEN (XSS Mitigation)                               ║
 * ║     - El JWT ya no se accede con `localStorage.getItem('token')` directamente. ║
 * ║     - Toda interacción con el storage pasa por `tokenStorage.ts` — la       ║
 * ║       única fuente de verdad para el token en el frontend.                  ║
 * ║     - Si en el futuro se migra a HttpOnly Cookie, solo `tokenStorage.ts`    ║
 * ║       necesita cambiar — este archivo permanece intacto.                    ║
 * ║                                                                              ║
 * ║  2. LIMPIEZA DE SESIÓN (Token + Estado React)                              ║
 * ║     - `logout()` y la gestión de 401 ejecutan `clearSession()`:            ║
 * ║       * removeToken()    → elimina el JWT del storage                       ║
 * ║       * setUser(null)    → limpia el estado React                           ║
 * ║       * Ningún dato del usuario queda en memoria                            ║
 * ║                                                                              ║
 * ║  3. INTERCEPCIÓN DE SESIÓN EXPIRADA (401 Global)                           ║
 * ║     - El interceptor de `api.ts` emite `SESSION_EXPIRED_EVENT` al           ║
 * ║       detectar un 401. AuthContext lo escucha con un event listener y       ║
 * ║       llama `clearSession()` sin depender de importaciones circulares.      ║
 * ║     - La redirección a /login la hace `api.ts` vía `window.location`.      ║
 * ║                                                                              ║
 * ║  4. TIPADO ESTRICTO (Eliminado `any`)                                      ║
 * ║     - `login(token, userData)` ya no acepta `userData: any`.               ║
 * ║     - `SessionUser` extiende `UserProfile` de `src/types/user.ts` con el   ║
 * ║       campo `id` que devuelve el backend en login/register.                 ║
 * ║     - `updateUser` y `updateFavorites` están correctamente tipados.         ║
 * ║                                                                              ║
 * ║  5. VALIDACIÓN DE TOKEN AL ARRANQUE                                        ║
 * ║     - Si el token existe pero el servidor devuelve 401 al montar,          ║
 * ║       el token se elimina automáticamente (token expirado en storage).      ║
 * ║                                                                              ║
 * ║  6. PROTECCIÓN CONTRA DATOS PARCIALES                                      ║
 * ║     - `login()` no confía en `userData` del servidor como fuente de         ║
 * ║       verdad definitiva — guarda el token y hace fetch del perfil.         ║
 * ║     - Esto garantiza que el estado React siempre refleje la BD real.       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module context/AuthContext
 */

import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import api, { SESSION_EXPIRED_EVENT } from '../services/api';
import { getToken, setToken, removeToken } from '../lib/tokenStorage';
import type { UserProfile } from '../types/user';

// ─── Tipos de dominio de sesión ────────────────────────────────────────────────

/**
 * Datos del usuario en sesión activa.
 *
 * Extiende `UserProfile` (que espeja el documento de BD sin campos sensibles)
 * con el campo `id` que el backend devuelve en las respuestas de auth.
 *
 * NOTA: El backend devuelve `_id` en el documento de MongoDB pero `id`
 * en las respuestas de login/register (serialización de Mongoose).
 * Ambos están tipados aquí para máxima compatibilidad.
 */
export interface SessionUser extends Omit<UserProfile, '_id'> {
    /** ID de usuario — presente en respuestas de login/register */
    id:   string;
    /** ID de MongoDB — presente en respuestas de GET /profile */
    _id?: string;
}

/**
 * Contrato público del AuthContext.
 * Todos los consumidores (hooks, componentes) deben cumplir con esta interfaz.
 */
export interface AuthContextType {
    /** Usuario autenticado actualmente. `null` si no hay sesión activa. */
    user:             SessionUser | null;
    /** `true` durante la verificación inicial del token al montar la app. */
    loading:          boolean;
    /**
     * Inicia sesión guardando el JWT y cargando el perfil del usuario.
     * @param token - JWT devuelto por el backend en login/register
     */
    login:            (token: string) => Promise<void>;
    /**
     * Cierra la sesión limpiando el token y el estado React.
     * Garantiza que ningún dato del usuario queda en memoria.
     */
    logout:           () => void;
    /**
     * Actualiza el array de favoritos del usuario en el estado local.
     * Llamar después de un toggle exitoso en el backend.
     */
    updateFavorites:  (favorites: string[]) => void;
    /**
     * Reemplaza los datos del usuario en el estado local.
     * Llamar después de operaciones que devuelven el usuario actualizado (buy/sell/profile edit).
     */
    updateUser:       (userData: Partial<SessionUser>) => void;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user,    setUser]    = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Ref para prevenir que la limpieza de sesión se ejecute durante el unmount
    const isMounted = useRef(true);

    // ── Utilidad interna: limpieza total de sesión ────────────────────────────

    /**
     * Limpia completamente la sesión del usuario.
     * - Elimina el JWT del storage (previene futuros requests autenticados)
     * - Limpia el estado React (previene datos colgados en memoria)
     *
     * Se llama en logout() Y en el manejador de SESSION_EXPIRED_EVENT.
     */
    const clearSession = useCallback((): void => {
        removeToken();
        if (isMounted.current) {
            setUser(null);
        }
    }, []);

    // ── Verificación de token al montar ───────────────────────────────────────

    useEffect(() => {
        isMounted.current = true;

        const verifyAndLoadSession = async (): Promise<void> => {
            const token = getToken();

            if (!token) {
                // No hay token — sesión limpia, no hay nada que verificar
                setLoading(false);
                return;
            }

            try {
                // El interceptor de request en api.ts inyecta el token automáticamente
                const { data } = await api.get<SessionUser>('/users/profile');
                if (isMounted.current) {
                    setUser(data);
                }
            } catch {
                // El servidor rechazó el token (expirado, inválido, revocado)
                // El interceptor 401 de api.ts ya habrá llamado clearSession si fue un 401
                // Para cualquier otro error, limpiar manualmente por seguridad
                if (isMounted.current) {
                    clearSession();
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        };

        verifyAndLoadSession();

        return () => {
            isMounted.current = false;
        };
    }, [clearSession]);

    // ── Manejador de sesión expirada (interceptada por api.ts) ───────────────

    useEffect(() => {
        /**
         * Escucha el evento SESSION_EXPIRED_EVENT emitido por el interceptor 401 de api.ts.
         * Esto cierra la sesión en React sin depender de importaciones circulares.
         *
         * Flujo completo de un 401:
         *  1. api.ts interceptor → removeToken() + dispatchEvent(SESSION_EXPIRED_EVENT)
         *  2. Este listener     → setUser(null)  [React state cleanup]
         *  3. api.ts interceptor → window.location.href = '/login'  [redirect]
         */
        const handleSessionExpired = (): void => {
            if (isMounted.current) {
                setUser(null);
            }
        };

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => {
            window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        };
    }, []);

    // ── Acciones de autenticación ─────────────────────────────────────────────

    /**
     * Inicia sesión:
     * 1. Persiste el JWT en tokenStorage
     * 2. Carga el perfil desde el servidor (fuente de verdad real)
     *
     * Por qué no usar `userData` del login directamente:
     * La respuesta de login puede tener campos incompletos o stale.
     * Cargar el perfil garantiza que el estado React siempre refleje la BD.
     *
     * @throws Si la carga del perfil falla después de guardar el token
     */
    const login = useCallback(async (token: string): Promise<void> => {
        setToken(token);
        try {
            // Cargar perfil desde el servidor para garantizar datos completos y frescos
            const { data } = await api.get<SessionUser>('/users/profile');
            setUser(data);
        } catch (error) {
            // Si la carga del perfil falla, no dejar un token huérfano persistido:
            // quedaría un estado "semi-autenticado" que sobrevive al reload.
            removeToken();
            throw error;
        }
    }, []);

    /**
     * Cierra la sesión del usuario.
     * Limpia token + estado React. No hace llamada al servidor
     * (los JWTs son stateless — no existe un endpoint de logout en este diseño).
     */
    const logout = useCallback((): void => {
        clearSession();
    }, [clearSession]);

    /**
     * Actualiza el array de favoritos en el estado local.
     * Usar después de un toggle de favorito exitoso en el backend.
     */
    const updateFavorites = useCallback((favorites: string[]): void => {
        setUser(prev => prev ? { ...prev, favorites } : null);
    }, []);

    /**
     * Actualiza parcialmente los datos del usuario en el estado local.
     * Acepta `Partial<SessionUser>` para permitir actualizaciones atómicas
     * de un subconjunto de campos (e.g., solo wallet después de un trade).
     */
    const updateUser = useCallback((userData: Partial<SessionUser>): void => {
        setUser(prev => prev ? { ...prev, ...userData } : null);
    }, []);

    // ── Valor del contexto ────────────────────────────────────────────────────

    // useMemo: sin esto, cada render del provider crearía un objeto nuevo y
    // forzaría el re-render de todos los consumidores (Navbar, tablas, hooks...).
    const contextValue: AuthContextType = useMemo(
        () => ({ user, loading, login, logout, updateFavorites, updateUser }),
        [user, loading, login, logout, updateFavorites, updateUser],
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// ─── Hook de consumo ──────────────────────────────────────────────────────────

/**
 * Hook para consumir el contexto de autenticación.
 *
 * @throws {Error} Si se usa fuera de `<AuthProvider>` — fallo rápido en desarrollo.
 *
 * @example
 * const { user, login, logout } = useAuth();
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de <AuthProvider>. Verifica que el componente esté envuelto correctamente en App.tsx.');
    }
    return context;
};
