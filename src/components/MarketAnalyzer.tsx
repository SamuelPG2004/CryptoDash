
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.5-flash';

interface MarketData {
  symbol: string;
  price: string;
  volume: string;
  change24h: string;
}

interface AnalysisResult {
  raw: string;
  sentiment: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL';
  soporte: string;
  resistencia: string;
  justificacion: string;
}

function getSentimentColor(sentiment: string) {
  if (sentiment === 'ALCISTA') return 'text-green-500 border-green-500';
  if (sentiment === 'BAJISTA') return 'text-red-500 border-red-500';
  return 'text-yellow-400 border-yellow-400';
}

const apiKey = process.env.REACT_APP_GEMINI_KEY;

export default function MarketAnalyzer() {
  const [data, setData] = useState<MarketData>({ symbol: '', price: '', volume: '', change24h: '' });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function getMarketAnalysis(data: MarketData) {
    if (!apiKey) {
      setError('No se ha configurado la API KEY de Gemini.');
      return;
    }
    const prompt = `Eres un experto en trading deportivo y cripto. Analiza estos datos de mercado: ${JSON.stringify(data)}. Dame un veredicto de sentimiento (ALCISTA/BAJISTA/NEUTRAL), un punto de Soporte, uno de Resistencia y una breve justificación técnica de 2 frases.`;
    try {
      setLoading(true);
      setError('');
      setResult(null);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL });
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      // Extraer sentimiento, soporte, resistencia y justificación
      const sentimentMatch = text.match(/sentimiento\s*[:\-]?\s*(ALCISTA|BAJISTA|NEUTRAL)/i);
      const soporteMatch = text.match(/soporte\s*[:\-]?\s*([\d\.]+)/i);
      const resistenciaMatch = text.match(/resistencia\s*[:\-]?\s*([\d\.]+)/i);
      const justMatch = text.match(/justificaci[oó]n\s*[:\-]?\s*(.+)/i);
      setResult({
        raw: text,
        sentiment: sentimentMatch ? (sentimentMatch[1].toUpperCase() as AnalysisResult['sentiment']) : 'NEUTRAL',
        soporte: soporteMatch ? soporteMatch[1] : '-',
        resistencia: resistenciaMatch ? resistenciaMatch[1] : '-',
        justificacion: justMatch ? justMatch[1] : text
      });
    } catch (e) {
      setError('Error al analizar el mercado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-8 max-w-md mx-auto shadow-lg border border-slate-800">
      <h2 className="text-xl font-bold mb-6 text-white">Market Analyzer IA</h2>
      <div className="flex flex-col gap-4 mb-4">
        <input
          className="bg-slate-800 text-white rounded px-3 py-2 focus:outline-none"
          placeholder="Símbolo (ej: BTC)"
          value={data.symbol}
          onChange={e => setData({ ...data, symbol: e.target.value })}
        />
        <input
          className="bg-slate-800 text-white rounded px-3 py-2 focus:outline-none"
          placeholder="Precio"
          type="number"
          value={data.price}
          onChange={e => setData({ ...data, price: e.target.value })}
        />
        <input
          className="bg-slate-800 text-white rounded px-3 py-2 focus:outline-none"
          placeholder="Volumen"
          type="number"
          value={data.volume}
          onChange={e => setData({ ...data, volume: e.target.value })}
        />
        <input
          className="bg-slate-800 text-white rounded px-3 py-2 focus:outline-none"
          placeholder="Cambio 24h (%)"
          type="number"
          value={data.change24h}
          onChange={e => setData({ ...data, change24h: e.target.value })}
        />
      </div>
      <button
        className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
        onClick={() => getMarketAnalysis(data)}
        disabled={loading || !data.symbol || !data.price || !data.volume || !data.change24h}
      >
        {loading && (
          <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        )}
        Generar Análisis con IA
      </button>
      {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}
      {result && (
        <div className={`mt-6 border rounded-xl p-4 ${getSentimentColor(result.sentiment)} bg-slate-950/60`}>  
          <div className="font-bold mb-2">Sentimiento: <span>{result.sentiment}</span></div>
          <div className="text-sm mb-1">Soporte: <span className="font-mono">{result.soporte}</span></div>
          <div className="text-sm mb-1">Resistencia: <span className="font-mono">{result.resistencia}</span></div>
          <div className="text-xs mt-2 text-slate-300">{result.justificacion}</div>
        </div>
      )}
    </div>
  );
}
