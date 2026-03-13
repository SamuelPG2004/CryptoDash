import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Calculator, RefreshCw, TrendingUp } from 'lucide-react';
import api from '../services/api.ts';

interface Crypto {
    id: string;
    symbol: string;
    name: string;
    price: number;
    image?: string;
    change?: number;
}

type Direction = 'crypto-to-usdt' | 'usdt-to-crypto';

const Converter: React.FC = () => {
    const [cryptos, setCryptos] = useState<Crypto[]>([]);
    const [amount, setAmount] = useState<string>('1');
    const [selectedCrypto, setSelectedCrypto] = useState<string>('');
    const [direction, setDirection] = useState<Direction>('crypto-to-usdt');
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchPrices = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { data } = await api.get('/crypto/prices');
            const list: Crypto[] = data.slice(0, 30).map((c: any) => ({
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                price: c.price,
                image: c.image,
                change: c.change,
            }));
            setCryptos(list);
            if (list.length > 0 && !selectedCrypto) {
                setSelectedCrypto(list[0].id);
            }
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error fetching prices for converter', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCrypto]);

    useEffect(() => {
        fetchPrices();
    }, []);

    const selectedCryptoData = cryptos.find(c => c.id === selectedCrypto);
    const cryptoPrice = selectedCryptoData?.price || 0;
    const numericAmount = parseFloat(amount) || 0;

    // Core conversion logic: crypto <-> USDT (USDT ≈ USD pegged 1:1)
    const convertedValue =
        direction === 'crypto-to-usdt'
            ? numericAmount * cryptoPrice          // X crypto → Y USDT
            : numericAmount / (cryptoPrice || 1);  // X USDT → Y crypto

    const formatResult = (value: number): string => {
        if (value === 0) return '0.00';
        if (value >= 1) {
            return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        }
        // For very small values (like DOGE/SHIB amounts)
        return value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 10 });
    };

    const handleSwap = () => {
        setDirection(prev => prev === 'crypto-to-usdt' ? 'usdt-to-crypto' : 'crypto-to-usdt');
        // Swap the converted value into the input so the user sees a smooth swap
        setAmount(formatResult(convertedValue).replace(/,/g, ''));
    };

    const fromLabel = direction === 'crypto-to-usdt'
        ? selectedCryptoData?.symbol ?? '...'
        : 'USDT';
    const toLabel = direction === 'crypto-to-usdt'
        ? 'USDT'
        : selectedCryptoData?.symbol ?? '...';

    const changeColor = (selectedCryptoData?.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
    const changeBg = (selectedCryptoData?.change ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10';

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Calculator className="text-blue-400" size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white tracking-tight leading-none">Conversor</h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium uppercase tracking-widest">Crypto ↔ USDT</p>
                    </div>
                </div>

                <button
                    onClick={() => fetchPrices(true)}
                    disabled={refreshing}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                    title="Actualizar precios"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
                {/* Crypto Selector */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">
                        Criptomoneda
                    </label>
                    {loading ? (
                        <div className="h-12 bg-zinc-800/60 rounded-xl animate-pulse" />
                    ) : (
                        <select
                            value={selectedCrypto}
                            onChange={e => setSelectedCrypto(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                        >
                            {cryptos.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.symbol} — {c.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Live price badge */}
                    {selectedCryptoData && (
                        <div className="flex items-center gap-2 mt-2">
                            <TrendingUp size={11} className={changeColor} />
                            <span className="text-[11px] text-zinc-500 font-mono">
                                1 {selectedCryptoData.symbol} =&nbsp;
                                <span className="text-white font-bold">
                                    ${cryptoPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                </span>
                                &nbsp;USDT
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${changeBg} ${changeColor}`}>
                                {(selectedCryptoData.change ?? 0) >= 0 ? '+' : ''}{(selectedCryptoData.change ?? 0).toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* FROM Field */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">
                        De — <span className="text-blue-400">{fromLabel}</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-20 text-white text-lg font-mono font-bold focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="0.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-zinc-500 uppercase tracking-widest pointer-events-none">
                            {fromLabel}
                        </span>
                    </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSwap}
                        className="group bg-zinc-800 hover:bg-blue-500/20 border border-zinc-700 hover:border-blue-500/50 p-3 rounded-2xl text-zinc-400 hover:text-blue-400 transition-all duration-200 active:scale-95 shadow-lg"
                        title="Invertir dirección"
                    >
                        <ArrowLeftRight size={16} className="rotate-90 group-hover:rotate-[-90deg] transition-transform duration-300" />
                    </button>
                </div>

                {/* TO Field (result) */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">
                        A — <span className="text-emerald-400">{toLabel}</span>
                    </label>
                    <div className="relative">
                        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 pr-20 flex items-center min-h-[52px]">
                            {loading ? (
                                <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
                            ) : (
                                <span className="text-lg font-mono font-bold text-emerald-300">
                                    {formatResult(convertedValue)}
                                </span>
                            )}
                        </div>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-zinc-500 uppercase tracking-widest pointer-events-none">
                            {toLabel}
                        </span>
                    </div>
                </div>

                {/* Last updated */}
                {lastUpdated && (
                    <p className="text-center text-[10px] text-zinc-600 font-medium">
                        Precios actualizados: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Converter;
