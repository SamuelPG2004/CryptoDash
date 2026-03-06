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
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // To avoid causing dependency cycles, using fetch or api instance
                const token = localStorage.getItem('token');
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch('/api/news/feed', { headers });
                if (response.ok) {
                    const data = await response.json();
                    setNews(data);
                }
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
        const interval = setInterval(fetchNews, 5 * 60 * 1000); // refresh every 5 mins
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
                {loading ? (
                    <div className="text-center text-zinc-500 text-sm mt-10 animate-pulse">Cargando noticias reales...</div>
                ) : news.map((item) => (
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={item.id}
                        className="group block p-4 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/50 hover:border-emerald-500/30 rounded-2xl transition-all duration-300 cursor-pointer"
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
                    </a>
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
