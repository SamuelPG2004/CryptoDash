import React, { useState, useEffect } from 'react';
import CryptoTable from '../components/CryptoTable.tsx';
import { TrendingUp, Shield, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MarketTicker: React.FC = () => {
  const [prices, setPrices] = useState([
    { symbol: 'BTC', price: '64,231.40', change: '+2.4%' },
    { symbol: 'ETH', price: '3,452.12', change: '+1.8%' },
    { symbol: 'SOL', price: '145.67', change: '-0.5%' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => prev.map(p => ({
        ...p,
        price: (parseFloat(p.price.replace(',', '')) + (Math.random() - 0.5) * 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const tickerItems = [...prices, ...prices, ...prices, ...prices, ...prices, ...prices];

  return (
    <div className="bg-zinc-950/50 backdrop-blur-md border-b border-zinc-900 overflow-hidden py-3">
      <div className="flex whitespace-nowrap animate-marquee">
        {tickerItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-10 border-r border-zinc-800/50 last:border-0">
            <span className="text-zinc-500 font-black text-[10px] tracking-widest">{item.symbol}</span>
            <span className="text-white font-mono text-xs font-bold">${item.price}</span>
            <span className={`text-[10px] font-black ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950">
      <MarketTicker />
      
      <div className="relative overflow-hidden">
        {/* Hero Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-zinc-950 to-zinc-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-20 relative z-10">
          <header className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 mb-8">
              <TrendingUp size={16} />
              <span className="font-bold tracking-widest uppercase text-[10px]">Resumen del Mercado</span>
            </div>
            
            <h1 className="text-5xl sm:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9] max-w-4xl mx-auto uppercase">
              OPERA EL <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">FUTURO</span> <br />
              <span className="text-zinc-600">DE LAS FINANZAS.</span>
            </h1>

            <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-medium">
              Experimenta la próxima generación en el comercio de activos digitales con seguridad de nivel institucional y ejecución ultrarrápida.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/register" 
                className="group bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-10 py-4 rounded-2xl transition-all duration-300 shadow-2xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95"
              >
                Empezar ahora <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/login" 
                className="text-zinc-400 hover:text-white font-bold px-10 py-4 transition-colors"
              >
                Ver Mercados
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-8 rounded-3xl hover:border-emerald-500/30 transition-all group">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-3">Ejecución Instantánea</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Compra y vende activos criptográficos con una velocidad asombrosa y latencia cero.</p>
              </div>
              
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-8 rounded-3xl hover:border-emerald-500/30 transition-all group">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-3">Almacenamiento Seguro</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Tus activos están protegidos por protocolos de seguridad líderes en la industria.</p>
              </div>
              
              <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-8 rounded-3xl hover:border-emerald-500/30 transition-all group">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-3">Análisis en Vivo</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Obtén datos de mercado en tiempo real y herramientas de gráficos avanzadas.</p>
              </div>
            </div>
          </header>

          <section className="mt-20">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Activos Principales</h2>
                <p className="text-zinc-500 text-sm mt-1">Rendimiento del mercado en tiempo real</p>
              </div>
              <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                Transmisión en Vivo
              </span>
            </div>
            <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-3xl overflow-hidden">
              <CryptoTable />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Home;
