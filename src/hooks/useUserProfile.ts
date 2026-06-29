/**
 * @fileoverview useUserProfile — Hook de carga y mutación del perfil de usuario.
 *
 * RESPONSABILIDAD ÚNICA:
 *  - Carga inicial del perfil desde GET /api/users/profile
 *  - Actualización de datos personales (PUT /users/profile)
 *  - Cambio de contraseña (PUT /users/password)
 *  - Eliminación de alertas de precio (DELETE /users/alerts/:id)
 *
 * El componente `Profile` solo consume este hook — no tiene ninguna llamada
 * a `api` directa. Toda la lógica de datos vive aquí.
 *
 * MANEJO DE ERRORES:
 *  Los errores se exponen tipados para que la UI los muestre según contexto.
 *
 * @module hooks/useUserProfile
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { UserProfile, EditProfileData } from '../types/user';

// ─── Tipos del hook ────────────────────────────────────────────────────────────

export interface UseUserProfileReturn {
    /** Datos del perfil del usuario. `null` durante la carga inicial. */
    profile:     UserProfile | null;
    /** `true` durante la carga inicial (sin datos previos) */
    loading:     boolean;
    /** Mensaje de error si la carga del perfil falló */
    fetchError:  string | null;
    /** Actualiza los datos personales del perfil (requiere PIN) */
    updateProfile:  (data: EditProfileData, pin: string) => Promise<void>;
    /** Cambia la contraseña del usuario (requiere PIN) */
    updatePassword: (newPassword: string, pin: string)  => Promise<void>;
    /** Elimina una alerta de precio por su ID */
    removeAlert:    (alertId: string)                   => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook principal de la página de perfil.
 * Carga el perfil del usuario y expone mutaciones tipadas.
 *
 * @example
 * const { profile, loading, updateProfile, removeAlert } = useUserProfile();
 */
export function useUserProfile(): UseUserProfileReturn {
    const [profile,    setProfile]    = useState<UserProfile | null>(null);
    const [loading,    setLoading]    = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Carga inicial ─────────────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;

        const fetchProfile = async (): Promise<void> => {
            try {
                const { data } = await api.get<UserProfile>('/users/profile');
                if (!cancelled) setProfile(data);
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : 'Error al cargar el perfil';
                    setFetchError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchProfile();

        // Cleanup: evita setState sobre componente desmontado
        return () => { cancelled = true; };
    }, []);

    // ── Mutaciones ────────────────────────────────────────────────────────────

    /**
     * Actualiza los datos personales del perfil.
     * Lanza un error si el servidor rechaza la operación (PIN incorrecto, etc.).
     */
    const updateProfile = useCallback(async (data: EditProfileData, pin: string): Promise<void> => {
        const { data: updated } = await api.put<UserProfile>('/users/profile', { ...data, pin });
        setProfile(updated);
    }, []);

    /**
     * Cambia la contraseña del usuario.
     * Lanza un error si el PIN es incorrecto o la contraseña no cumple los requisitos.
     */
    const updatePassword = useCallback(async (newPassword: string, pin: string): Promise<void> => {
        await api.put('/users/password', { pin, newPassword });
        // No hay dato a actualizar en el estado — el cambio es solo en el servidor
    }, []);

    /**
     * Elimina una alerta de precio por su ID.
     * Actualiza el estado local optimistamente con la respuesta del servidor.
     */
    const removeAlert = useCallback(async (alertId: string): Promise<void> => {
        const { data: updatedAlerts } = await api.delete<UserProfile['alerts']>(`/users/alerts/${alertId}`);
        setProfile(prev => prev ? { ...prev, alerts: updatedAlerts } : prev);
    }, []);

    return { profile, loading, fetchError, updateProfile, updatePassword, removeAlert };
}
