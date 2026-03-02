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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const { user, updateFavorites } = useAuth();

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
      if (!selectedCoinId && formattedData.length > 0) {
        setSelectedCoinId(formattedData[0].id);
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000); // Poll every 15 seconds as requested
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

  return (
    <div className="space-y-6">
      {/* Trend Chart Section */}
      {selectedCoin && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <TrendingUp size={200} className="text-emerald-500" />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src={selectedCoin.image} alt="" className="w-12 h-12 rounded-full" />
              <div>
                <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Tendencia de Precio</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">{selectedCoin.name}</span>
                  <span className="text-zinc-500 font-mono text-sm">{selectedCoin.symbol}/USD</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white font-mono">
                ${selectedCoin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className={cn(
                "text-sm font-mono flex items-center justify-end gap-1",
                selectedCoin.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {selectedCoin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(selectedCoin.price_change_percentage_24h).toFixed(2)}% (24h)
              </div>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedCoin.price_change_percentage_24h >= 0 ? "#10b981" : "#fb7185"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={selectedCoin.price_change_percentage_24h >= 0 ? "#10b981" : "#fb7185"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis hide dataKey="time" />
                <YAxis 
                  hide 
                  domain={['auto', 'auto']} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={selectedCoin.price_change_percentage_24h >= 0 ? "#10b981" : "#fb7185"} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
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
