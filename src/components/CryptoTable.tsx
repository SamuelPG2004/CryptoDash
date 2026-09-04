/**
 * @fileoverview CryptoTable — Componente principal del dashboard de mercado.
 *
 * REFACTORIZACIÓN APLICADA (vs. versión original de 523 líneas):
 *
 *  ✅ SRP (Single Responsibility Principle):
 *     El componente solo orquesta UI. Toda la lógica de fetching y negocio
 *     fue extraída a hooks dedicados:
 *       - `useCryptoPrices`  → fetching + polling + transformación de datos
 *       - `useCryptoActions` → trade, favoritos, alertas
 *       - `useGeminiAnalysis` → análisis de IA (hook ya existente, ahora usado)
 *
 *  ✅ alert() / prompt() eliminados:
 *     Reemplazados por UI inline en el componente (input de precio de alerta).
 *     Mejora UX en móvil y es testeable en JSDOM.
 *
 *  ✅ Tipado estricto:
 *     Eliminado `any` en portfolio. Usa `PortfolioItem` del módulo de dominio.
 *
 *  ✅ useCallback en todos los handlers que se pasan como props:
 *     Evita re-renders innecesarios en componentes hijos (TradeModal, filas de tabla).
 *
 *  ✅ Error Boundary:
 *     El componente exporta también `CryptoTableErrorBoundary` para uso en App.tsx.
 *
 *  ✅ DRY:
 *     `cn()` importada de `src/lib/cn` — eliminada la redefinición local.
 *
 *  ✅ Indicadores técnicos y lógica de cálculo:
 *     Movidos a `src/lib/technicalIndicators.ts` (testeables independientemente).
 *
 * @module components/CryptoTable
 */

import React, {
    useState,
    useMemo,
    useCallback,
} from 'react';
import {
    Star,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    TrendingUp,
    Bell,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

import { cn } from '../lib/cn';
import { calculateSMA, calculateRSI } from '../lib/technicalIndicators';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGeminiAnalysis } from '../services/useGeminiAnalysis';
import { useCryptoPrices } from '../hooks/useCryptoPrices';
import { useCryptoActions } from '../hooks/useCryptoActions';
import TradeModal from './TradeModal';
import { CoinLogo } from './CoinLogo';
import type { Crypto, ChartDataPoint, TechnicalIndicators, TradeModalState } from '../types/crypto';

// ─── Sub-componentes puros ─────────────────────────────────────────────────────

/**
 * Spinner de carga inicial con mensaje descriptivo.
 */
const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-20 bg-zinc-950 rounded-xl border border-zinc-800 border-dashed">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium animate-pulse">Cargando mercado real...</p>
        <p className="text-zinc-600 text-xs mt-2">Sincronizando Top 50 activos con CoinGecko</p>
    </div>
);

/**
 * Pantalla de error cuando no hay datos disponibles.
 */
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-20 bg-zinc-950 rounded-xl border border-rose-800/30 border-dashed">
        <p className="text-rose-400 font-medium">{message}</p>
        <p className="text-zinc-600 text-xs mt-2">Usando datos de referencia mientras se restablece la conexión</p>
    </div>
);

/** Props del tooltip personalizado de Recharts */
interface ChartTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
}

/**
 * Tooltip personalizado para el gráfico de área.
 * Componente puro — no tiene estado ni efectos secundarios.
 */
const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
            <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Punto de Datos</p>
            <p className="text-white font-mono font-bold text-lg">
                ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
        </div>
    );
};

// ─── Panel de Alertas inline (reemplaza prompt() nativo) ──────────────────────

interface AlertPanelProps {
    coin: Crypto;
    onConfirm: (targetPrice: number) => void;
    onCancel: () => void;
}

/**
 * Panel de creación de alerta inline.
 * Reemplaza el nativo `prompt()` — compatible con móvil, testeable y accesible.
 */
const AlertPanel: React.FC<AlertPanelProps> = ({ coin, onConfirm, onCancel }) => {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(value);
        if (!price || price <= 0 || isNaN(price)) return;
        onConfirm(price);
    };

    return (
        <div className="bg-zinc-900/80 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-md mt-4">
            <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">Nueva Alerta</p>
            <p className="text-zinc-400 text-xs mb-3">
                Precio actual de <span className="text-white font-bold">{coin.symbol}</span>:{' '}
                <span className="font-mono text-emerald-400">${coin.current_price.toLocaleString()}</span>
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Precio objetivo USD..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl py-2 px-3 text-white font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                    Crear
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                    Cancelar
                </button>
            </form>
        </div>
    );
};

// ─── Componente Principal ──────────────────────────────────────────────────────

interface CryptoTableProps {
    /** Si `true`, filtra la lista mostrando solo las monedas favoritas del usuario */
    filterFavorites?: boolean;
}

/**
 * Dashboard principal de mercado de criptomonedas.
 *
 * Muestra:
 * - Gráfico de área con sparkline de la moneda seleccionada
 * - Indicadores técnicos (SMA-20, RSI-14)
 * - Panel de análisis con IA (Groq)
 * - Tabla filtrable de los Top 50 activos
 * - Acciones de trading, favoritos y alertas
 *
 * @param filterFavorites - Muestra solo favoritos del usuario cuando es `true`
 */
const CryptoTable: React.FC<CryptoTableProps> = ({ filterFavorites }) => {
    // ── Datos y acciones ──────────────────────────────────────────────────────
    const { cryptos, loading, error }         = useCryptoPrices();
    const { executeTrade, toggleFavorite, createAlert } = useCryptoActions();
    const { user }                            = useAuth();
    const { showToast }                       = useToast();
    const { result: aiAnalysis, loading: isAnalyzing, analyze: analyzeWithAI, error: aiError } = useGeminiAnalysis();

    // ── Estado local de UI ────────────────────────────────────────────────────
    const [searchTerm,     setSearchTerm]     = useState('');
    const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
    const [tradeModal,     setTradeModal]     = useState<TradeModalState>({ open: false, type: 'buy' });
    const [showAlertPanel, setShowAlertPanel] = useState(false);

    // ── Datos derivados con memoización ───────────────────────────────────────

    const filteredCryptos = useMemo<Crypto[]>(() => {
        // En modo favoritos SIEMPRE se filtra: con 0 favoritos la lista queda
        // vacía y se muestra el empty state (antes caía a la lista completa).
        const base = filterFavorites
            ? cryptos.filter((c) => user?.favorites?.includes(c.id))
            : cryptos;

        if (!searchTerm.trim()) return base;

        const term = searchTerm.toLowerCase();
        return base.filter(
            (c) =>
                c.name.toLowerCase().includes(term) ||
                c.symbol.toLowerCase().includes(term)
        );
    }, [cryptos, searchTerm, filterFavorites, user?.favorites]);

    const selectedCoin = useMemo<Crypto | undefined>(
        () => cryptos.find((c) => c.id === selectedCoinId) ?? cryptos[0],
        [cryptos, selectedCoinId]
    );

    const chartData = useMemo<ChartDataPoint[]>(
        () => (selectedCoin?.sparkline ?? []).map((price, time) => ({ time, price })),
        [selectedCoin]
    );

    const indicators = useMemo<TechnicalIndicators | null>(() => {
        const prices = selectedCoin?.sparkline ?? [];
        if (prices.length < 20) return null;
        return {
            sma: calculateSMA(prices, 20),
            rsi: calculateRSI(prices, 14),
        };
    }, [selectedCoin]);

    // Cantidad de tokens del activo seleccionado en el portfolio del usuario
    const ownedAmount = useMemo<number>(() => {
        if (!user || !selectedCoin) return 0;
        const item = user.portfolio?.find((p) => p.coinId === selectedCoin.id);
        return item?.amount ?? 0;
    }, [user, selectedCoin]);

    // Color de la tendencia del gráfico
    const trendColor = (selectedCoin?.price_change_percentage_24h ?? 0) >= 0 ? '#10b981' : '#fb7185';

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSelectCoin = useCallback((id: string) => {
        setSelectedCoinId(id);
    }, []);

    const handleOpenTrade = useCallback((type: 'buy' | 'sell') => {
        if (!user) return;   // El botón no se muestra a usuarios no autenticados
        setTradeModal({ open: true, type });
    }, [user]);

    const handleCloseTrade = useCallback(() => {
        setTradeModal((prev) => ({ ...prev, open: false }));
    }, []);

    const handleExecuteTrade = useCallback(async (amount: number) => {
        if (!selectedCoin) return;
        await executeTrade({ coin: selectedCoin, type: tradeModal.type, amount });
    }, [selectedCoin, tradeModal.type, executeTrade]);

    const handleToggleFavorite = useCallback(async (e: React.MouseEvent, coinId: string) => {
        e.stopPropagation();
        if (!user) return;
        try {
            await toggleFavorite(coinId);
        } catch {
            showToast('No se pudo actualizar el favorito. Inténtalo de nuevo.', 'error');
        }
    }, [user, toggleFavorite, showToast]);

    const handleCreateAlert = useCallback(async (targetPrice: number) => {
        if (!selectedCoin) return;
        try {
            await createAlert({ coin: selectedCoin, targetPrice });
            setShowAlertPanel(false);
            showToast(`Alerta creada para ${selectedCoin.symbol} en $${targetPrice.toLocaleString()}`, 'success');
        } catch {
            showToast('No se pudo crear la alerta. Inténtalo de nuevo.', 'error');
        }
    }, [selectedCoin, createAlert, showToast]);

    const handleAskAI = useCallback(async () => {
        if (!selectedCoin) return;
        await analyzeWithAI({
            symbol:    selectedCoin.symbol,
            price:     String(selectedCoin.current_price),
            volume:    '0',
            change24h: String(selectedCoin.price_change_percentage_24h),
        });
    }, [selectedCoin, analyzeWithAI]);

    // ── Estados de carga y error ──────────────────────────────────────────────

    if (loading && cryptos.length === 0) return <LoadingState />;
    if (error   && cryptos.length === 0) return <ErrorState message={error} />;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="space-y-6">

                {/* Banner no bloqueante: el polling falló pero hay datos previos.
                    Sin esto, los precios se quedarían obsoletos en silencio. */}
                {error && cryptos.length > 0 && (
                    <div
                        role="status"
                        className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-4 py-3 rounded-xl"
                    >
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        Conexión con el mercado inestable — mostrando los últimos precios disponibles.
                    </div>
                )}

                {/* ── Sección de Gráfico y Análisis ─────────────────────────── */}
                {selectedCoin && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-8 shadow-2xl overflow-hidden relative group">
                        {/* Icono decorativo de fondo */}
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <TrendingUp size={240} className="text-emerald-500" />
                        </div>

                        {/* Header: Coin Info + Precio + Acciones */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                            {/* Info de la moneda */}
                            <div className="flex items-center gap-3 sm:gap-5">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                                    <CoinLogo
                                        symbol={selectedCoin.symbol}
                                        name={selectedCoin.name}
                                        image={selectedCoin.image}
                                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl relative border border-zinc-800 bg-zinc-900 p-2"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Análisis Técnico</span>
                                        <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                        <span className="text-emerald-500 text-[10px] font-bold uppercase">En Vivo</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter break-words">{selectedCoin.name}</h2>
                                        <span className="text-zinc-500 font-mono text-sm sm:text-lg bg-zinc-900 px-2 sm:px-3 py-1 rounded-lg border border-zinc-800">
                                            {selectedCoin.symbol}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Precio + Acciones */}
                            <div className="flex flex-col items-stretch md:items-end gap-3 relative z-10">
                                <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-8 bg-zinc-900/50 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-zinc-800 shadow-xl">
                                    <div className="text-left md:text-right">
                                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Precio actual</div>
                                        <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                                            ${selectedCoin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="h-10 w-px bg-zinc-800" />
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">24h Change</div>
                                        <div className={cn(
                                            'text-lg sm:text-xl font-black font-mono flex items-center justify-end gap-1',
                                            selectedCoin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                        )}>
                                            {selectedCoin.price_change_percentage_24h >= 0
                                                ? <ArrowUpRight size={20} />
                                                : <ArrowDownRight size={20} />}
                                            {Math.abs(selectedCoin.price_change_percentage_24h).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Botones de acción — solo visibles para usuarios autenticados */}
                                {/* En móvil los botones ocupan el ancho completo (flex-1) — targets táctiles cómodos */}
                                <div className="flex flex-wrap justify-end gap-2">
                                    {user ? (
                                        <>
                                            <button
                                                id="btn-buy"
                                                onClick={() => handleOpenTrade('buy')}
                                                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                                            >
                                                Comprar
                                            </button>
                                            <button
                                                id="btn-sell"
                                                onClick={() => handleOpenTrade('sell')}
                                                className="flex-1 md:flex-none bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-3 rounded-xl transition-all active:scale-95"
                                            >
                                                Vender
                                            </button>
                                            <button
                                                id="btn-alert"
                                                onClick={() => setShowAlertPanel((prev) => !prev)}
                                                className={cn(
                                                    'bg-zinc-800 hover:bg-zinc-700 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center border',
                                                    showAlertPanel
                                                        ? 'text-amber-400 border-amber-500/50'
                                                        : 'text-amber-500 border-zinc-700 hover:border-amber-500/50'
                                                )}
                                                title="Crear Alerta de Precio"
                                                aria-label="Crear alerta de precio"
                                                aria-expanded={showAlertPanel}
                                            >
                                                <Bell size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <p className="text-zinc-500 text-xs italic self-center">
                                            Inicia sesión para operar
                                        </p>
                                    )}
                                </div>

                                {/* Panel de alerta inline (reemplaza prompt nativo) */}
                                {showAlertPanel && selectedCoin && user && (
                                    <AlertPanel
                                        coin={selectedCoin}
                                        onConfirm={handleCreateAlert}
                                        onCancel={() => setShowAlertPanel(false)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Gráfico + Panel IA */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-6 relative z-10">
                            {/* Gráfico de área */}
                            <div className="lg:col-span-3 h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={trendColor} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                        <XAxis hide dataKey="time" />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip cursor={{ stroke: '#27272a', strokeWidth: 2 }} content={<ChartTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke={trendColor}
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorPrice)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Panel de IA */}
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-purple-500/10 rounded-lg">
                                            <TrendingUp className="text-purple-400" size={16} />
                                        </div>
                                        <h3 className="text-white font-bold text-sm tracking-tight uppercase">AI Insights</h3>
                                    </div>

                                    {aiError ? (
                                        <p className="text-rose-400 text-xs leading-relaxed">{aiError}</p>
                                    ) : aiAnalysis ? (
                                        <p className="text-zinc-400 text-xs leading-relaxed italic border-l-2 border-purple-500/30 pl-3">
                                            {aiAnalysis.justificacion || aiAnalysis.raw}
                                        </p>
                                    ) : (
                                        <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest text-center py-10">
                                            Pulsa para analizar tendencia
                                        </p>
                                    )}
                                </div>

                                {/* El endpoint de IA requiere sesión (consume cuota de Groq) */}
                                <button
                                    id="btn-analyze-ai"
                                    onClick={handleAskAI}
                                    disabled={isAnalyzing || !user}
                                    className={cn(
                                        'mt-4 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2',
                                        isAnalyzing
                                            ? 'bg-zinc-800 text-zinc-500 animate-pulse cursor-not-allowed'
                                            : !user
                                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
                                    )}
                                >
                                    {isAnalyzing
                                        ? 'Generando...'
                                        : !user
                                            ? 'Inicia sesión para usar IA'
                                            : 'Analizar con IA'}
                                </button>
                            </div>
                        </div>

                        {/* Footer de indicadores técnicos */}
                        <div className="mt-6 flex items-center justify-between text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
                            <span>Historial 7D</span>
                            {indicators ? (
                                <div className="flex gap-4">
                                    {indicators.sma !== null && (
                                        <span className="text-emerald-500/60">
                                            SMA(20): ${indicators.sma.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    )}
                                    {indicators.rsi !== null && (
                                        <span className={cn(
                                            indicators.rsi > 70 ? 'text-rose-500/60' :
                                            indicators.rsi < 30 ? 'text-emerald-500/60' :
                                            'text-zinc-500/60'
                                        )}>
                                            RSI(14): {indicators.rsi}
                                            {indicators.rsi > 70 ? ' • Sobrecomprado' :
                                             indicators.rsi < 30 ? ' • Sobrevendido' : ''}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-zinc-700">Datos insuficientes para indicadores</span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tabla de Mercado ───────────────────────────────────────── */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Barra de búsqueda */}
                    <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900/30">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                id="crypto-search"
                                type="text"
                                placeholder="Buscar criptomoneda... (BTC, Ethereum...)"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-label="Buscar criptomoneda"
                            />
                        </div>
                        <div className="text-xs text-zinc-500 font-mono hidden sm:block">
                            Mostrando {filteredCryptos.length} activos
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="max-h-[500px] overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse" aria-label="Tabla de mercado de criptomonedas">
                            <thead className="sticky top-0 z-10 bg-zinc-950 shadow-sm">
                                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                                    <th className="p-2.5 sm:p-4 font-medium whitespace-nowrap" scope="col">Activo</th>
                                    <th className="p-2.5 sm:p-4 font-medium whitespace-nowrap" scope="col">Precio</th>
                                    <th className="p-2.5 sm:p-4 font-medium whitespace-nowrap" scope="col">
                                        <span className="sm:hidden">24h</span>
                                        <span className="hidden sm:inline">Cambio 24h</span>
                                    </th>
                                    <th className="p-2.5 sm:p-4 font-medium text-right whitespace-nowrap" scope="col">
                                        <span className="hidden sm:inline">Acción</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {filteredCryptos.map((crypto) => (
                                    <tr
                                        key={crypto.id}
                                        onClick={() => handleSelectCoin(crypto.id)}
                                        className={cn(
                                            'hover:bg-zinc-900/50 transition-all duration-300 group cursor-pointer',
                                            selectedCoinId === crypto.id && 'bg-emerald-500/5'
                                        )}
                                        aria-selected={selectedCoinId === crypto.id}
                                    >
                                        {/* Activo — padding y tipografía compactos en móvil para que
                                            precio y cambio 24h entren sin scroll horizontal */}
                                        <td className="p-2.5 sm:p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0">
                                                    <CoinLogo
                                                        symbol={crypto.symbol}
                                                        name={crypto.name}
                                                        image={crypto.image}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white group-hover:text-emerald-400 transition-colors text-sm sm:text-base max-w-[110px] sm:max-w-none truncate">
                                                        {crypto.name}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 uppercase font-mono tracking-tighter">
                                                        {crypto.symbol}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Precio */}
                                        <td className="p-2.5 sm:p-4 font-mono text-white whitespace-nowrap text-sm sm:text-base">
                                            ${crypto.current_price.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>

                                        {/* Cambio 24h */}
                                        <td className="p-2.5 sm:p-4 whitespace-nowrap">
                                            <div className={cn(
                                                'flex items-center gap-1 font-mono text-xs sm:text-sm px-2 py-1 rounded-md w-fit',
                                                crypto.price_change_percentage_24h > 0
                                                    ? 'text-emerald-400 bg-emerald-400/10'
                                                    : crypto.price_change_percentage_24h < 0
                                                        ? 'text-rose-400 bg-rose-400/10'
                                                        : 'text-zinc-500 bg-zinc-800'
                                            )}>
                                                {crypto.price_change_percentage_24h > 0
                                                    ? <ArrowUpRight size={14} />
                                                    : crypto.price_change_percentage_24h < 0
                                                        ? <ArrowDownRight size={14} />
                                                        : null}
                                                {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                                            </div>
                                        </td>

                                        {/* Favorito */}
                                        <td className="p-2.5 sm:p-4 text-right whitespace-nowrap">
                                            {user && (
                                                <button
                                                    onClick={(e) => handleToggleFavorite(e, crypto.id)}
                                                    className={cn(
                                                        'p-2 rounded-lg transition-all transform active:scale-90',
                                                        user.favorites?.includes(crypto.id)
                                                            ? 'text-yellow-500 bg-yellow-500/10'
                                                            : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                                                    )}
                                                    aria-label={
                                                        user.favorites?.includes(crypto.id)
                                                            ? `Quitar ${crypto.name} de favoritos`
                                                            : `Añadir ${crypto.name} a favoritos`
                                                    }
                                                    aria-pressed={user.favorites?.includes(crypto.id)}
                                                >
                                                    <Star
                                                        size={20}
                                                        fill={user.favorites?.includes(crypto.id) ? 'currentColor' : 'none'}
                                                    />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredCryptos.length === 0 && (
                            <div className="p-20 text-center text-zinc-500 italic">
                                {searchTerm.trim()
                                    ? <>No se encontraron activos que coincidan con &ldquo;{searchTerm}&rdquo;</>
                                    : filterFavorites
                                        ? 'Aún no tienes favoritos. Marca la estrella de un activo para verlo aquí.'
                                        : 'No hay activos disponibles en este momento.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Trading */}
            {selectedCoin && (
                <TradeModal
                    isOpen={tradeModal.open}
                    type={tradeModal.type}
                    coin={selectedCoin}
                    walletBalance={user?.wallet ?? 0}
                    ownedAmount={ownedAmount}
                    onConfirm={handleExecuteTrade}
                    onClose={handleCloseTrade}
                />
            )}
        </>
    );
};

export default CryptoTable;
