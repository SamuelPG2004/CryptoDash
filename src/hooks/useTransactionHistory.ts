/**
 * @fileoverview useTransactionHistory — Hook de carga paginada del historial de operaciones.
 *
 * RESPONSABILIDAD ÚNICA:
 *  - Carga inicial del historial desde GET /api/transactions
 *  - Paginación client-side con ventana deslizante (preparado para paginación server-side)
 *  - Filtrado por tipo de operación (buy/sell/all)
 *
 * PREPARACIÓN PARA VIRTUALIZACIÓN:
 *  El hook expone `visibleTransactions` (ventana paginada) y `total` por separado.
 *  Cuando el historial crezca lo suficiente para requerir virtualización
 *  (e.g., con react-virtual o TanStack Virtual), solo este hook necesita cambiar —
 *  el componente no se toca.
 *
 * PREPARACIÓN PARA PAGINACIÓN SERVER-SIDE:
 *  El hook ya expone `page` y `setPage`. Cuando el backend implemente
 *  GET /api/transactions?page=X&limit=Y, solo se actualiza `fetchTransactions`
 *  en este hook — el componente no cambia.
 *
 * @module hooks/useTransactionHistory
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import type { Transaction } from '../types/user';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Número de transacciones por página en la vista del historial */
const PAGE_SIZE = 10;

// ─── Tipos del hook ────────────────────────────────────────────────────────────

/** Filtro por tipo de operación */
export type TransactionFilter = 'all' | 'buy' | 'sell';

export interface UseTransactionHistoryReturn {
    /** Transacciones visibles en la página actual (ya filtradas) */
    visibleTransactions: Transaction[];
    /** Total de transacciones después de aplicar el filtro */
    totalFiltered:       number;
    /** Total de transacciones en el historial completo (sin filtro) */
    totalAll:            number;
    /** Página actual (1-indexed) */
    page:                number;
    /** Número total de páginas para la selección de filtro actual */
    totalPages:          number;
    /** `true` durante la carga inicial */
    loading:             boolean;
    /** Mensaje de error si la carga falló */
    error:               string | null;
    /** Filtro activo */
    filter:              TransactionFilter;
    /** Cambia el filtro activo y resetea a la página 1 */
    setFilter:           (filter: TransactionFilter) => void;
    /** Navega a una página específica */
    setPage:             (page: number) => void;
    /** Fuerza una recarga del historial */
    refetch:             () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook de historial de transacciones con paginación client-side y filtrado.
 *
 * @example
 * const { visibleTransactions, totalPages, page, setPage, filter, setFilter } =
 *   useTransactionHistory();
 */
export function useTransactionHistory(): UseTransactionHistoryReturn {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading,         setLoading]         = useState(true);
    const [error,           setError]           = useState<string | null>(null);
    const [filter,          setFilterState]     = useState<TransactionFilter>('all');
    const [page,            setPageState]       = useState(1);
    const [fetchKey,        setFetchKey]        = useState(0);  // trigger para refetch

    // ── Carga del historial ───────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const fetchTransactions = async (): Promise<void> => {
            try {
                const { data } = await api.get<Transaction[]>('/transactions');
                if (!cancelled) setAllTransactions(data);
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : 'Error al cargar el historial';
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchTransactions();
        return () => { cancelled = true; };
    }, [fetchKey]);

    // ── Datos derivados con memoización ───────────────────────────────────────

    /** Lista filtrada según el tipo seleccionado */
    const filteredTransactions = useMemo<Transaction[]>(() => {
        if (filter === 'all') return allTransactions;
        return allTransactions.filter(t => t.type === filter);
    }, [allTransactions, filter]);

    const totalFiltered = filteredTransactions.length;
    const totalAll      = allTransactions.length;
    const totalPages    = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

    /** Ventana de la página actual */
    const visibleTransactions = useMemo<Transaction[]>(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredTransactions.slice(start, start + PAGE_SIZE);
    }, [filteredTransactions, page]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    /** Cambia el filtro y resetea a la página 1 */
    const setFilter = useCallback((newFilter: TransactionFilter): void => {
        setFilterState(newFilter);
        setPageState(1);
    }, []);

    /** Navega a una página (con bounds checking) */
    const setPage = useCallback((newPage: number): void => {
        setPageState(prev => {
            const bounded = Math.max(1, Math.min(newPage, totalPages));
            return bounded;
        });
    }, [totalPages]);

    /** Fuerza recarga incrementando el key */
    const refetch = useCallback((): void => {
        setFetchKey(k => k + 1);
    }, []);

    return {
        visibleTransactions,
        totalFiltered,
        totalAll,
        page,
        totalPages,
        loading,
        error,
        filter,
        setFilter,
        setPage,
        refetch,
    };
}
