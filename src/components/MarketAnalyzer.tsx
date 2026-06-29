import React, { useState } from 'react';
import {
    Bot, Sparkles, TrendingUp, TrendingDown, Minus,
    Target, ArrowDownToLine, ArrowUpToLine, Activity,
} from 'lucide-react';
import { useGeminiAnalysis, type MarketData } from '../services/useGeminiAnalysis';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSentimentStyles(sentiment: string) {
    if (sentiment === 'ALCISTA')
        return {
            color:  'text-emerald-400',
            border: 'border-emerald-500/30',
            bg:     'bg-emerald-500/10',
            icon:   <TrendingUp className="w-5 h-5 text-emerald-400" />,
        };
    if (sentiment === 'BAJISTA')
        return {
            color:  'text-rose-400',
            border: 'border-rose-500/30',
            bg:     'bg-rose-500/10',
            icon:   <TrendingDown className="w-5 h-5 text-rose-400" />,
        };
    return {
        color:  'text-amber-400',
        border: 'border-amber-500/30',
        bg:     'bg-amber-500/10',
        icon:   <Minus className="w-5 h-5 text-amber-400" />,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketAnalyzer() {
    const [data, setData] = useState<MarketData>({
        symbol:    '',
        price:     '',
        volume:    '',
        change24h: '',
    });

    // Todo el estado de IA (loading, error, result) vive en el hook.
    // La GEMINI_API_KEY NUNCA llega al cliente — se gestiona en el backend.
    const { result, loading, error, analyze } = useGeminiAnalysis();

    const isFormValid =
        data.symbol.trim() !== '' &&
        data.price     !== '' &&
        data.volume    !== '' &&
        data.change24h !== '';

    return (
        <div className="relative group max-w-md mx-auto">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

            <div className="relative bg-zinc-950/80 backdrop-blur-xl rounded-[32px] p-8 border border-zinc-800/50 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                            <Bot className="w-6 h-6 text-emerald-400" />
                            IA Analyzer
                        </h2>
                        <p className="text-sm text-zinc-500 font-medium mt-1">
                            Análisis técnico por Gemini 2.5
                        </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                </div>

                {/* Form Inputs */}
                <div className="space-y-4 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                Símbolo
                            </label>
                            <div className="relative">
                                <input
                                    id="market-symbol"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 text-white rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-zinc-700 font-mono text-sm"
                                    placeholder="ej: BTC"
                                    value={data.symbol}
                                    onChange={(e) =>
                                        setData({ ...data, symbol: e.target.value.toUpperCase() })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                Precio
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-zinc-600 font-mono text-sm">$</span>
                                <input
                                    id="market-price"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 text-white rounded-2xl pl-8 pr-4 py-3 outline-none transition-all placeholder:text-zinc-700 font-mono text-sm"
                                    placeholder="0.00"
                                    type="number"
                                    min="0"
                                    value={data.price}
                                    onChange={(e) => setData({ ...data, price: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                Volumen (24h)
                            </label>
                            <div className="relative">
                                <input
                                    id="market-volume"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 text-white rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-zinc-700 font-mono text-sm"
                                    placeholder="Volumen"
                                    type="number"
                                    min="0"
                                    value={data.volume}
                                    onChange={(e) => setData({ ...data, volume: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                Cambio (24h)
                            </label>
                            <div className="relative">
                                <input
                                    id="market-change"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 text-white rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-zinc-700 font-mono text-sm"
                                    placeholder="%"
                                    type="number"
                                    value={data.change24h}
                                    onChange={(e) =>
                                        setData({ ...data, change24h: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    id="market-analyze-btn"
                    className="relative w-full overflow-hidden rounded-2xl p-[1px] group disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => analyze(data)}
                    disabled={loading || !isFormValid}
                    aria-busy={loading}
                    aria-label="Generar análisis de mercado con IA"
                >
                    {/* Animated border */}
                    <span className="absolute inset-[-1000%] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#14b8a6_50%,#10b981_100%)] opacity-70 group-hover:opacity-100 transition-opacity animate-[spin_3s_linear_infinite]" />
                    <div className="relative bg-zinc-950/90 backdrop-blur-sm rounded-2xl px-4 py-4 flex items-center justify-center gap-2 group-hover:bg-zinc-950/70 transition-all">
                        {loading ? (
                            <>
                                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                                <span className="font-bold text-white tracking-wide">Analizando...</span>
                            </>
                        ) : (
                            <>
                                <Target className="w-5 h-5 text-emerald-400" />
                                <span className="font-bold text-white tracking-wide">Generar Análisis</span>
                            </>
                        )}
                    </div>
                </button>

                {/* Error state */}
                {error && (
                    <div
                        role="alert"
                        className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-2 animate-in fade-in zoom-in"
                    >
                        <Activity className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Result Card */}
                {result && (
                    <div
                        className={`mt-8 overflow-hidden rounded-2xl border ${getSentimentStyles(result.sentiment).border} ${getSentimentStyles(result.sentiment).bg} transition-all duration-500 animate-in fade-in slide-in-from-bottom-4`}
                    >
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                Veredicto IA
                            </span>
                            <div className="flex items-center gap-2 bg-zinc-950/50 rounded-full px-3 py-1 border border-white/5">
                                {getSentimentStyles(result.sentiment).icon}
                                <span className={`text-xs font-bold ${getSentimentStyles(result.sentiment).color}`}>
                                    {result.sentiment}
                                </span>
                            </div>
                        </div>

                        <div className="p-5 grid grid-cols-2 gap-4 bg-zinc-950/20">
                            <div>
                                <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                    <ArrowDownToLine className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Soporte</span>
                                </div>
                                <span className="text-white font-mono text-sm">${result.soporte}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                    <ArrowUpToLine className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Resistencia</span>
                                </div>
                                <span className="text-white font-mono text-sm">${result.resistencia}</span>
                            </div>
                        </div>

                        <div className="p-5 border-t border-white/5 bg-zinc-950/40">
                            <p className="text-sm leading-relaxed text-zinc-300">
                                {result.justificacion}
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
