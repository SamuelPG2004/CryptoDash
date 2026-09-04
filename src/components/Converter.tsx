import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ArrowUpDown } from 'lucide-react';
import api from '../services/api';

interface Coin {
    id: string;
    symbol: string;
    name: string;
    price: number;
}

/**
 * Formatea el resultado con decimales adaptados a la magnitud:
 * $80,000 → 2 decimales; 0.000012 BTC → hasta 8 significativos.
 */
function formatAmount(value: number): string {
    if (!isFinite(value)) return '';
    if (value === 0) return '0';
    if (value >= 1) {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return value.toLocaleString(undefined, { maximumSignificantDigits: 8 });
}

const Converter: React.FC = () => {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [fromAmount, setFromAmount] = useState('');
    const [fromCoin, setFromCoin] = useState('BTC');
    const [toCoin, setToCoin] = useState('USDT');
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const fetchCoins = async () => {
        setRefreshing(true);
        try {
            const { data } = await api.get<Coin[]>('/crypto/prices');
            setCoins(data.map((c) => ({
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                price: c.price,
            })));
            setLoadError(false);
        } catch {
            // Conservar la lista anterior si existía; solo marcar el error
            setLoadError(true);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCoins();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Conversión en vivo ────────────────────────────────────────────────────
    // Se recalcula al escribir o cambiar de moneda — sin botón intermedio.
    const { toAmount, rate } = useMemo(() => {
        const from = coins.find(c => c.symbol === fromCoin);
        const to   = coins.find(c => c.symbol === toCoin);
        if (!from || !to || to.price === 0) return { toAmount: '', rate: null };

        const unitRate = from.price / to.price;
        const amount   = parseFloat(fromAmount);
        return {
            toAmount: isNaN(amount) ? '' : formatAmount(amount * unitRate),
            rate:     unitRate,
        };
    }, [coins, fromAmount, fromCoin, toCoin]);

    /** Intercambia las monedas de origen y destino */
    const handleSwap = () => {
        setFromCoin(toCoin);
        setToCoin(fromCoin);
    };

    return (
        <div className="bg-zinc-900/50 rounded-2xl p-4 w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-black text-white">Conversor</span>
                <button
                    onClick={fetchCoins}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-100 transition-all active:scale-95 disabled:opacity-40 flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label="Actualizar precios"
                    tabIndex={0}
                >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Input: De */}
            <div className="mb-1">
                <label htmlFor="converter-from" className="text-xs text-gray-400 mb-1 block">De</label>
                <div className="flex gap-2">
                    <input
                        id="converter-from"
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={fromAmount}
                        onChange={e => setFromAmount(e.target.value)}
                        className="bg-black text-white rounded-lg px-3 py-2 w-full outline-none text-sm focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Cantidad"
                    />
                    <select
                        value={fromCoin}
                        onChange={e => setFromCoin(e.target.value)}
                        aria-label="Moneda de origen"
                        className="bg-black text-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
                    >
                        {/* Placeholder mientras carga: evita el warning de <select> controlado sin opción coincidente */}
                        {coins.length === 0 && <option value={fromCoin}>{fromCoin}</option>}
                        {coins.map(c => (
                            <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Botón de intercambio */}
            <div className="flex justify-center -my-0.5 relative z-10">
                <button
                    onClick={handleSwap}
                    aria-label="Intercambiar monedas"
                    className="p-1.5 rounded-full bg-zinc-800 hover:bg-emerald-600 border border-zinc-700 text-zinc-300 hover:text-white transition-all active:scale-90"
                >
                    <ArrowUpDown size={14} />
                </button>
            </div>

            {/* Input: A */}
            <div className="mb-3">
                <label htmlFor="converter-to" className="text-xs text-gray-400 mb-1 block">A</label>
                <div className="flex gap-2">
                    <input
                        id="converter-to"
                        type="text"
                        value={toAmount}
                        readOnly
                        className="bg-black text-emerald-400 font-mono rounded-lg px-3 py-2 w-full outline-none text-sm"
                        placeholder="Resultado"
                        aria-live="polite"
                    />
                    <select
                        value={toCoin}
                        onChange={e => setToCoin(e.target.value)}
                        aria-label="Moneda de destino"
                        className="bg-black text-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
                    >
                        {coins.length === 0 && <option value={toCoin}>{toCoin}</option>}
                        {coins.map(c => (
                            <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tasa de cambio actual — transparencia de la conversión */}
            {rate !== null && (
                <p className="text-[11px] text-zinc-500 font-mono text-center">
                    1 {fromCoin} = {formatAmount(rate)} {toCoin}
                </p>
            )}

            {/* Error visible: sin esto el usuario vería dropdowns vacíos sin explicación */}
            {loadError && coins.length === 0 && (
                <p className="text-rose-400 text-xs font-bold mt-2" role="alert">
                    No se pudieron cargar los precios. Pulsa actualizar para reintentar.
                </p>
            )}
        </div>
    );
};

export default Converter;
