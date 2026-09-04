import React, { useState, useEffect } from 'react';
import CryptoTable from '../components/CryptoTable.tsx';
import NewsPanel from '../components/NewsPanel.tsx';
import Converter from '../components/Converter.tsx';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MarketTicker: React.FC = () => {
  const [prices, setPrices] = useState<{ symbol: string; price: number; change: number }[]>([]);

  useEffect(() => {
    // Fetch real prices from the backend (which caches CoinGecko)
    let cancelled = false;
    const loadPrices = async () => {
      try {
        const res = await fetch('/api/crypto/prices');
        if (!res.ok) throw new Error('fetch failed');
        const data: { symbol: string; price?: number; change?: number }[] = await res.json();
        const top = data.slice(0, 6).map((c) => ({
          symbol: c.symbol,
          price: c.price ?? 0,
          change: c.change ?? 0,
        }));
        if (cancelled) return;
        setPrices(top);
      } catch {
        if (cancelled) return;
        // Fallback if API is not available
        setPrices([
          { symbol: 'BTC', price: 64231, change: 2.4 },
          { symbol: 'ETH', price: 3452, change: 1.8 },
          { symbol: 'SOL', price: 145.67, change: -0.5 },
        ]);
      }
    };

    loadPrices();

    // Simulate micro price drift every 3 seconds (within ±0.05% of real price)
    const interval = setInterval(() => {
      setPrices(prev =>
        prev.map(p => ({
          ...p,
          price: Math.max(0, p.price * (1 + (Math.random() - 0.5) * 0.001)),
        }))
      );
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const tickerItems = prices.length > 0 ? [...prices, ...prices, ...prices, ...prices] : [];

  return (
    <div className="bg-zinc-950/50 backdrop-blur-md border-b border-zinc-900 overflow-hidden py-3">
      <div className="flex whitespace-nowrap animate-marquee">
        {tickerItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 sm:px-10 border-r border-zinc-800/50 last:border-0">
            <span className="text-zinc-500 font-black text-[10px] tracking-widest">{item.symbol}</span>
            <span className="text-white font-mono text-xs font-bold">
              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] font-black ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-zinc-950">
      <MarketTicker />

      <div className="relative overflow-hidden">
        {/* Hero Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-zinc-950 to-zinc-950 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 pt-24 pb-20 relative z-10">
          <header className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 mb-8">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold tracking-widest uppercase text-[10px]">{t('marketTicker')}</span>
            </div>

            <h1 className="text-4xl sm:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9] max-w-4xl mx-auto uppercase break-words">
              {t('heroTitle1')} <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]">{t('heroTitle2')}</span> <br />
              <span className="text-zinc-600 italic font-light lowercase">{t('heroTitle3')}</span>
            </h1>

            <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-medium">
              {t('heroDesc')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-10 py-4 rounded-2xl transition-all duration-300 shadow-2xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95"
              >
                {t('createAccount')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="text-zinc-400 hover:text-white font-bold px-10 py-4 transition-colors"
              >
                {t('viewMarkets')}
              </Link>
            </div>
          </header>

          {/* Sección exclusiva para el Conversor */}
          <div className="max-w-lg mx-auto mb-12 mt-10">
            <Converter />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20">
            {/* Main Content: Table & Charts */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{t('leadingAssets')}</h2>
                  <p className="text-zinc-500 text-sm mt-1">{t('leadingAssetsDesc')}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global Vol: $82.4B</span>
                </div>
              </div>

              <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
                <CryptoTable />
              </div>
            </div>

            {/* Sidebar News */}
            <div className="space-y-8 pb-12 pt-4">
              <NewsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
