

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../services/api';

interface Coin {
    id: string;
    symbol: string;
    name: string;
    price: number;
}

const Converter: React.FC = () => {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
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

    const handleConvert = () => {
        const from = coins.find(c => c.symbol === fromCoin);
        const to = coins.find(c => c.symbol === toCoin);
        if (!from || !to) {
            setToAmount('');
            return;
        }
        // Conversion: fromAmount * (from.price / to.price)
        const result = parseFloat(fromAmount) * (from.price / to.price);
        setToAmount(isNaN(result) ? '' : result.toString());
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
                    aria-label="Actualizar"
                    tabIndex={0}
                >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Input: De */}
            <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">De</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={fromAmount}
                        onChange={e => setFromAmount(e.target.value)}
                        className="bg-black text-white rounded-lg px-3 py-2 w-full outline-none text-sm"
                        placeholder="Cantidad"
                    />
                    <select
                        value={fromCoin}
                        onChange={e => setFromCoin(e.target.value)}
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

            {/* Input: A */}
            <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">A</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={toAmount}
                        readOnly
                        className="bg-black text-white rounded-lg px-3 py-2 w-full outline-none text-sm"
                        placeholder="Resultado"
                    />
                    <select
                        value={toCoin}
                        onChange={e => setToCoin(e.target.value)}
                        className="bg-black text-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
                    >
                        {coins.length === 0 && <option value={toCoin}>{toCoin}</option>}
                        {coins.map(c => (
                            <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error visible: sin esto el usuario vería dropdowns vacíos sin explicación */}
            {loadError && coins.length === 0 && (
                <p className="text-rose-400 text-xs font-bold mb-2" role="alert">
                    No se pudieron cargar los precios. Pulsa actualizar para reintentar.
                </p>
            )}

            {/* Botón de convertir */}
            <button
                onClick={handleConvert}
                disabled={coins.length === 0}
                className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Convertir
            </button>
        </div>
    );
};

export default Converter;
