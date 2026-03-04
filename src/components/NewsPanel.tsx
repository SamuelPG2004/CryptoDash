import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface NewsItem {
    id: string;
    title: string;
    source: string;
    url: string;
    time: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
}

const NewsPanel: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([
        {
            id: '1',
            title: 'Bitcoin rompe la barrera de los $65,000 en medio de optimismo institucional',
            source: 'CryptoNews',
            url: '#',
            time: 'hace 5 min',
            sentiment: 'bullish'
        },
        {
            id: '2',
            title: 'Ethereum anuncia actualización en la red de pruebas para mejorar la escalabilidad',
            source: 'BlockDaily',
            url: '#',
            time: 'hace 15 min',
            sentiment: 'neutral'
        },
        {
            id: '3',
            title: 'Reguladores advierten sobre nuevos protocolos DeFi sin auditoría',
            source: 'FinanceWatch',
            url: '#',
            time: 'hace 45 min',
            sentiment: 'bearish'
        },
        {
            id: '4',
            title: 'Solana alcanza un nuevo máximo anual mientras el ecosistema NFT florece',
            source: 'ChainTalk',
            url: '#',
            time: 'hace 1 hora',
            sentiment: 'bullish'
        }
    ]);

    // Simulado de "noticias en vivo" - rotación o actualización
    useEffect(() => {
        const interval = setInterval(() => {
            // Solo un efecto visual de actualización
            setNews(prev => [...prev].sort(() => Math.random() - 0.5));
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <Newspaper className="text-emerald-500" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Flash de Noticias</h2>
                </div>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {news.map((item) => (
                    <div
                        key={item.id}
                        className="group p-4 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/50 hover:border-emerald-500/30 rounded-2xl transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                <Clock size={12} /> {item.time}
                            </span>
                            {item.sentiment === 'bullish' ? (
                                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    <TrendingUp size={10} /> BULLISH
                                </div>
                            ) : item.sentiment === 'bearish' ? (
                                <div className="flex items-center gap-1 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    <TrendingDown size={10} /> BEARISH
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    NEUTRAL
                                </div>
                            )}
                        </div>

                        <h3 className="text-zinc-200 font-bold leading-tight mb-3 group-hover:text-white transition-colors">
                            {item.title}
                        </h3>

                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-emerald-500 font-medium">{item.source}</span>
                            <ExternalLink size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-zinc-900/30 border-t border-zinc-800">
                <button className="w-full py-2 text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-emerald-500 transition-colors">
                    Ver todas las noticias
                </button>
            </div>
        </div>
    );
};

export default NewsPanel;
