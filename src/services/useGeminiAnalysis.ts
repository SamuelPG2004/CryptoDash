import { useState, useCallback } from 'react';
import api from './api';

// ─── Types (mirrored from geminiService.ts) ────────────────────────────────

export interface MarketData {
    symbol: string;
    price: string;
    volume: string;
    change24h: string;
}

export interface AnalysisResult {
    raw: string;
    sentiment: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL';
    soporte: string;
    resistencia: string;
    justificacion: string;
}

interface UseGeminiAnalysisReturn {
    result: AnalysisResult | null;
    loading: boolean;
    error: string;
    analyze: (data: MarketData) => Promise<void>;
    reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Custom hook para análisis técnico de mercado con Gemini AI.
 *
 * - Llama a POST /api/news/market-analyze (backend Express).
 * - La GEMINI_API_KEY NUNCA toca el cliente — vive solo en process.env.
 * - Maneja estados: loading, error, result.
 * - Usa la instancia axios de api.ts (interceptor JWT incluido).
 */
export function useGeminiAnalysis(): UseGeminiAnalysisReturn {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');

    const analyze = useCallback(async (data: MarketData) => {
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const { data: responseData } = await api.post<AnalysisResult>(
                '/news/market-analyze',
                {
                    symbol:    data.symbol,
                    price:     Number(data.price),
                    volume:    Number(data.volume),
                    change24h: Number(data.change24h),
                }
            );
            setResult(responseData);
        } catch (err: any) {
            const status  = err.response?.status;
            const message = err.response?.data?.message;

            if (status === 429) {
                setError('Demasiadas solicitudes. Espera un momento antes de analizar de nuevo.');
            } else if (status === 503) {
                setError('El servicio de IA no está disponible en este momento.');
            } else if (message) {
                setError(message);
            } else {
                setError('Error al analizar el mercado. Verifica tu conexión.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setResult(null);
        setError('');
    }, []);

    return { result, loading, error, analyze, reset };
}
