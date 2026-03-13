import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
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
            if (list.length > 0 && !selectedCrypto) setSelectedCrypto(list[0].id);
        } catch (err) {
            console.error('Converter fetch error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCrypto]);

    useEffect(() => { fetchPrices(); }, []);

    const selectedCryptoData = cryptos.find(c => c.id === selectedCrypto);
    const cryptoPrice = selectedCryptoData?.price || 0;
    const numericAmount = parseFloat(amount) || 0;

    const convertedValue = direction === 'crypto-to-usdt'
        ? numericAmount * cryptoPrice
        : numericAmount / (cryptoPrice || 1);

    const fmt = (v: number) => {
        if (v === 0) return '0.00';
        if (v >= 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        return v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    };

    const handleSwap = () => {
        setDirection(prev => prev === 'crypto-to-usdt' ? 'usdt-to-crypto' : 'crypto-to-usdt');
        setAmount(fmt(convertedValue).replace(/,/g, ''));
    };

    const fromSymbol = direction === 'crypto-to-usdt' ? (selectedCryptoData?.symbol ?? '—') : 'USDT';
    const toSymbol = direction === 'crypto-to-usdt' ? 'USDT' : (selectedCryptoData?.symbol ?? '—');
    const change = selectedCryptoData?.change ?? 0;
    const isUp = change >= 0;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl w-full max-w-xs mx-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-lg font-black text-white tracking-tight">Conversor</span>
                <button
                    onClick={() => fetchPrices(true)}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-100 hover:text-blue-400 transition-all active:scale-95 disabled:opacity-40 flex items-center"
                    aria-label="Actualizar precios"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="p-4 space-y-4">
                {/* Crypto selector */}
                <div>
                    <label className="block text-xs font-bold text-gray-100 mb-1">Criptomoneda</label>
                    {loading ? (
                        <div className="h-9 bg-zinc-800/60 rounded-lg animate-pulse" />
                    ) : (
                        <select
                            value={selectedCrypto}
                            onChange={e => setSelectedCrypto(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            {cryptos.map(c => (
                                <option key={c.id} value={c.id}>{c.symbol} — {c.name}</option>
                            ))}
                        </select>
                    )}
                    {/* Live price */}
                    {selectedCryptoData && !loading && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-300 font-mono">
                                1 <span className="text-blue-400 font-bold">{selectedCryptoData.symbol}</span>
                                {' = '}
                                <span className="text-white font-bold">
                                    ${cryptoPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </span>
                            </span>
                            <span className={`text-[11px] font-black px-1 py-0.5 rounded ${isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {isUp ? '+' : ''}{change.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>
                {/* Inputs row */}
                <div className="flex items-center gap-2">
                    {/* From input */}
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-100 mb-1 block">
                            {direction === 'crypto-to-usdt' ? fromSymbol : 'USDT'}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono font-bold focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="Cantidad"
                        />
                    </div>
                    {/* Swap button */}
                    <button
                        onClick={handleSwap}
                        className="group bg-zinc-800 hover:bg-blue-500/20 border border-zinc-700 hover:border-blue-500/50 p-2 rounded-xl text-gray-100 hover:text-blue-400 transition-all active:scale-90 flex items-center"
                        aria-label="Cambiar dirección"
                    >
                        <ArrowLeftRight size={18} className="rotate-0 group-hover:rotate-180 transition-transform duration-300" />
                    </button>
                    {/* To output */}
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-100 mb-1 block">
                            {direction === 'crypto-to-usdt' ? 'USDT' : toSymbol}
                        </label>
                        <div className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 min-h-10 flex items-center">
                            {loading ? (
                                <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse" />
                            ) : (
                                <span className="text-sm font-mono font-bold text-emerald-300 truncate">
                                    {fmt(convertedValue)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {/* Rate summary */}
                {selectedCryptoData && !loading && (
                    <div className="flex items-center justify-center gap-1 py-1 px-3 rounded-lg bg-zinc-800 border border-zinc-700">
                        <span className="text-[11px] text-gray-100 font-mono">
                            {numericAmount || 1} <span className="text-blue-400 font-bold">{fromSymbol}</span>
                            {' ≈ '}
                            <span className="text-emerald-400 font-bold">{fmt(convertedValue)}</span>
                            {' '}{toSymbol}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Converter;
