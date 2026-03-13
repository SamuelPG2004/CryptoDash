
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const COINS = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
];

const Converter: React.FC = () => {
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [fromCoin, setFromCoin] = useState('BTC');
    const [toCoin, setToCoin] = useState('USDT');
    const [refreshing, setRefreshing] = useState(false);

    // Simulación de conversión simple
    const handleConvert = () => {
        // Ejemplo: 1 BTC = 65000 USDT, 1 ETH = 3500 USDT
        let rate = 1;
        if (fromCoin === 'BTC' && toCoin === 'USDT') rate = 65000;
        else if (fromCoin === 'ETH' && toCoin === 'USDT') rate = 3500;
        else if (fromCoin === 'USDT' && toCoin === 'BTC') rate = 1 / 65000;
        else if (fromCoin === 'USDT' && toCoin === 'ETH') rate = 1 / 3500;
        else if (fromCoin === 'BTC' && toCoin === 'ETH') rate = 65000 / 3500;
        else if (fromCoin === 'ETH' && toCoin === 'BTC') rate = 3500 / 65000;
        else rate = 1;
        const result = parseFloat(fromAmount) * rate;
        setToAmount(isNaN(result) ? '' : result.toString());
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    return (
        <div className="bg-zinc-900/50 rounded-2xl p-4 w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-black text-white">Conversor</span>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-100 transition-all active:scale-95 disabled:opacity-40 flex items-center"
                    aria-label="Actualizar"
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
                        {COINS.map(c => (
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
                        {COINS.map(c => (
                            <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Botón de convertir */}
            <button
                onClick={handleConvert}
                className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
            >
                Convertir
            </button>
        </div>
    );
};

export default Converter;
