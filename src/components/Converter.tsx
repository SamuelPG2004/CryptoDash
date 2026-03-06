import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Calculator } from 'lucide-react';
import api from '../services/api.ts';

const Converter: React.FC = () => {
    const [cryptos, setCryptos] = useState<{ id: string, symbol: string, price: number }[]>([]);
    const [amount, setAmount] = useState<number | string>(1);
    const [selectedCrypto, setSelectedCrypto] = useState<string>('');
    const [fiatCurrency, setFiatCurrency] = useState<string>('USD');
    const [fiatRates, setFiatRates] = useState<any>({ USD: 1, EUR: 0.92, GBP: 0.79, ARS: 1000, COP: 4000 });

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const { data } = await api.get('/crypto/prices');
                setCryptos(data.slice(0, 10)); // Top 10 for simplicity
                if (data.length > 0) setSelectedCrypto(data[0].id);
            } catch (err) {
                console.error('Error fetching prices for converter', err);
            }
        };
        fetchPrices();
    }, []);

    const selectedCryptoPrice = cryptos.find(c => c.id === selectedCrypto)?.price || 0;

    // Calculate value in fiat
    const calculateFiat = () => {
        const baseUsdValue = Number(amount) * selectedCryptoPrice;
        return (baseUsdValue * fiatRates[fiatCurrency]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Calculator className="text-blue-500" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Conversor</h2>
            </div>

            <div className="p-6 flex flex-col gap-6">
                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Cantidad (Crypto)</label>
                    <div className="flex gap-4">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <select
                            value={selectedCrypto}
                            onChange={(e) => setSelectedCrypto(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors uppercase font-bold text-sm w-32"
                        >
                            {cryptos.map(c => <option key={c.id} value={c.id}>{c.symbol}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-zinc-800 p-2 rounded-full border-4 border-zinc-950 text-blue-500">
                        <ArrowLeftRight size={16} className="rotate-90" />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Valor (Fiat)</label>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white flex items-center">
                            <span className="font-mono text-xl">{calculateFiat()}</span>
                        </div>
                        <select
                            value={fiatCurrency}
                            onChange={(e) => setFiatCurrency(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors uppercase font-bold text-sm w-32"
                        >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="ARS">ARS</option>
                            <option value="COP">COP</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Converter;
