import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Star, ArrowUpRight, ArrowDownRight, Search, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../services/api.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Crypto {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  sparkline?: number[];
}

const CryptoTable: React.FC<{ filterFavorites?: boolean }> = ({ filterFavorites }) => {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user, updateFavorites, updateUser } = useAuth();

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!user) return alert('Debes iniciar sesión para operar');
    if (!selectedCoin) return;

    const amount = parseFloat(prompt(`¿Cuánto ${selectedCoin.symbol} deseas ${type === 'buy' ? 'comprar' : 'vender'}?`) || '0');
    if (amount <= 0 || isNaN(amount)) return;

    try {
      const { data } = await api.post(`/users/${type}`, {
        coinId: selectedCoin.id,
        symbol: selectedCoin.symbol,
        amount,
        price: selectedCoin.current_price
      });
      updateUser(data);
      alert(`${type === 'buy' ? 'Compra' : 'Venta'} exitosa de ${amount} ${selectedCoin.symbol}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error en la operación');
    }
  };

  const handleAskAI = async () => {
    if (!selectedCoin) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const { data } = await api.post('/crypto/analyze', {
        coinName: selectedCoin.name,
        coinSymbol: selectedCoin.symbol,
        currentPrice: selectedCoin.current_price,
        change24h: selectedCoin.price_change_percentage_24h
      });
      setAiAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
      setAiAnalysis("Error al obtener análisis de IA. Verifica tu API Key de Gemini.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const { data } = await api.get('/crypto/prices');

      const formattedData = data
        .filter((item: any) => item && item.id && item.symbol)
        .map((item: any) => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.id,
          current_price: item.price || 0,
          price_change_percentage_24h: item.change || 0,
          image: item.image || '',
          sparkline: item.sparkline || []
        }));

      setCryptos(formattedData);
      setError(null);
      if (!selectedCoinId && formattedData.length > 0) {
        setSelectedCoinId(formattedData[0].id);
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setError('No se pudieron cargar los datos del mercado. Reintentando...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Poll every 5 minutes — aligned with backend cache to avoid CoinGecko rate limits
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);


  const toggleFav = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return alert('Please login to add favorites');
    try {
      const { data } = await api.post('/users/favorites', { cryptoId: id });
      updateFavorites(data.favorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filteredCryptos = useMemo(() => {
    let base = filterFavorites && user?.favorites && user.favorites.length > 0
      ? cryptos.filter(c => user.favorites.includes(c.id))
      : cryptos;

    if (searchTerm) {
      base = base.filter(c =>
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.symbol && c.symbol.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return base;
  }, [cryptos, searchTerm, filterFavorites, user?.favorites]);

  const selectedCoin = useMemo(() =>
    cryptos.find(c => c.id === selectedCoinId) || cryptos[0]
    , [cryptos, selectedCoinId]);

  const chartData = useMemo(() => {
    if (!selectedCoin?.sparkline) return [];
    return selectedCoin.sparkline.map((price, index) => ({
      time: index,
      price: price
    }));
  }, [selectedCoin]);

  if (loading && cryptos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-zinc-950 rounded-xl border border-zinc-800 border-dashed">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 font-medium animate-pulse">Cargando mercado real...</p>
        <p className="text-zinc-600 text-xs mt-2">Sincronizando Top 50 activos con CoinGecko</p>
      </div>
    );
  }

  if (error && cryptos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-zinc-950 rounded-xl border border-rose-800/30 border-dashed">
        <p className="text-rose-400 font-medium">{error}</p>
        <p className="text-zinc-600 text-xs mt-2">Usando datos de referencia mientras se restablece la conexión</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Trend Chart Section */}
      {selectedCoin && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <TrendingUp size={240} className="text-emerald-500" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                <img src={selectedCoin.image} alt="" className="w-16 h-16 rounded-2xl relative border border-zinc-800 bg-zinc-900 p-2" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Análisis Técnico</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span className="text-emerald-500 text-[10px] font-bold uppercase">En Vivo</span>
                </div>
                <div className="flex items-center gap-3">
                  <h3 className="text-4xl font-black text-white tracking-tighter">{selectedCoin.name}</h3>
                  <span className="text-zinc-500 font-mono text-lg bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                    {selectedCoin.symbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 relative z-10">
              <div className="flex items-center gap-8 bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-xl">
                <div className="text-right">
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Precio actual</div>
                  <div className="text-3xl font-black text-white font-mono">
                    ${selectedCoin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="h-10 w-px bg-zinc-800" />
                <div className="text-right">
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">24h Change</div>
                  <div className={cn(
                    "text-xl font-black font-mono flex items-center justify-end gap-1",
                    selectedCoin.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {selectedCoin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    {Math.abs(selectedCoin.price_change_percentage_24h).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Trading Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleTrade('buy')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center gap-2"
                >
                  Comprar
                </button>
                <button
                  onClick={() => handleTrade('sell')}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  Vender
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-6 relative z-10">
            <div className="lg:col-span-3 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedCoin.price_change_percentage_24h >= 0 ? "#10b981" : "#fb7185"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={selectedCoin.price_change_percentage_24h >= 0 ? "#10b981" : "#fb7185"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis hide dataKey="time" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    cursor={{ stroke: '#27272a', strokeWidth: 2 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                            <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Punto de Datos</p>
                            <p className="text-white font-mono font-bold text-lg">
                              ${(payload[0].value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={selectedCoin.price_change_percentage_24h >= 0 ? "#10b981" : "#fb7185"}
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* AI Insights Sidebar */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="text-purple-400" size={16} />
                  </div>
                  <h4 className="text-white font-bold text-sm tracking-tight uppercase">AI Insights</h4>
                </div>

                {aiAnalysis ? (
                  <p className="text-zinc-400 text-xs leading-relaxed italic border-l-2 border-purple-500/30 pl-3">
                    {aiAnalysis}
                  </p>
                ) : (
                  <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest text-center py-10">
                    Pulsa para analizar tendencia
                  </p>
                )}
              </div>

              <button
                onClick={handleAskAI}
                disabled={isAnalyzing}
                className={cn(
                  "mt-4 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                  isAnalyzing ? "bg-zinc-800 text-zinc-500 animate-pulse" : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                )}
              >
                {isAnalyzing ? "Generando..." : "Analizar con IA"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
            <span>Historial 7D</span>
            <div className="flex gap-4">
              <span className="text-emerald-500/50">MA(20): $62.4k</span>
              <span className="text-rose-500/50">RSI: 58.2</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Table Section */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar criptomoneda... (BTC, Ethereum...)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs text-zinc-500 font-mono hidden sm:block">
            Mostrando {filteredCryptos.length} activos
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-950 shadow-sm">
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Activo</th>
                <th className="p-4 font-medium">Precio</th>
                <th className="p-4 font-medium">Cambio 24h</th>
                <th className="p-4 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredCryptos.map((crypto) => (
                <tr
                  key={crypto.id}
                  onClick={() => setSelectedCoinId(crypto.id)}
                  className={cn(
                    "hover:bg-zinc-900/50 transition-all duration-300 group cursor-pointer",
                    selectedCoinId === crypto.id && "bg-emerald-500/5"
                  )}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                        <img
                          src={crypto.image}
                          alt={crypto.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{crypto.name}</div>
                        <div className="text-xs text-zinc-500 uppercase font-mono tracking-tighter">{crypto.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-white">
                    ${crypto.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    <div className={cn(
                      "flex items-center gap-1 font-mono text-sm px-2 py-1 rounded-md w-fit",
                      crypto.price_change_percentage_24h > 0 ? "text-emerald-400 bg-emerald-400/10" :
                        crypto.price_change_percentage_24h < 0 ? "text-rose-400 bg-rose-400/10" : "text-zinc-500 bg-zinc-800"
                    )}>
                      {crypto.price_change_percentage_24h > 0 ? <ArrowUpRight size={14} /> :
                        crypto.price_change_percentage_24h < 0 ? <ArrowDownRight size={14} /> : null}
                      {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={(e) => toggleFav(e, crypto.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all transform active:scale-90",
                        user?.favorites.includes(crypto.id)
                          ? "text-yellow-500 bg-yellow-500/10"
                          : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                      )}
                    >
                      <Star size={20} fill={user?.favorites.includes(crypto.id) ? "currentColor" : "none"} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCryptos.length === 0 && (
            <div className="p-20 text-center text-zinc-500 italic">
              No se encontraron activos que coincidan con "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoTable;
