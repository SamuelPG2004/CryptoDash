import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown, WifiOff } from 'lucide-react';
import api from '../services/api';

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
    const [error, setError] = useState(false);

    useEffect(() => {
        // Flag de cancelación: evita setState sobre un componente desmontado
        // y descarta respuestas que lleguen fuera de orden.
        let cancelled = false;

        const fetchNews = async () => {
            try {
                // La instancia `api` inyecta el JWT desde tokenStorage automáticamente
                const { data } = await api.get<NewsItem[]>('/news/feed');
                if (!cancelled) {
                    setNews(data);
                    setError(false);
                }
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchNews();
        const interval = setInterval(fetchNews, 5 * 60 * 1000); // refresh every 5 mins
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
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
                    // Skeleton de carga — evita el salto de layout al llegar los datos
                    <>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl animate-pulse space-y-3">
                                <div className="h-3 w-24 bg-zinc-800 rounded" />
                                <div className="h-4 w-full bg-zinc-800 rounded" />
                                <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                            </div>
                        ))}
                    </>
                ) : error && news.length === 0 ? (
                    <div className="flex flex-col items-center text-center text-zinc-500 text-sm mt-10 gap-2">
                        <WifiOff size={24} className="text-zinc-600" />
                        <p>No se pudieron cargar las noticias.</p>
                        <p className="text-xs text-zinc-600">Se reintentará automáticamente.</p>
                    </div>
                ) : news.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm mt-10">
                        No hay noticias disponibles por ahora.
                    </div>
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
