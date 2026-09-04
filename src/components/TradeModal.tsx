import React, { useState, useEffect, useRef } from 'react';
import { isAxiosError } from 'axios';
import { X, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { cn } from '../lib/cn';
import { CoinLogo } from './CoinLogo';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
}

interface TradeModalProps {
  isOpen: boolean;
  type: 'buy' | 'sell';
  coin: Coin;
  walletBalance: number;
  ownedAmount: number; // how many tokens the user owns of this coin
  onConfirm: (amount: number) => Promise<void>;
  onClose: () => void;
}

const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  type,
  coin,
  walletBalance,
  ownedAmount,
  onConfirm,
  onClose,
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Depender de coin.id (no del objeto coin): el polling de precios crea un
  // objeto nuevo cada ciclo y borraría el formulario mientras el usuario escribe.
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError('');
      setSuccess('');
      setLoading(false);
    }
  }, [isOpen, type, coin.id]);

  // Cancela el auto-cierre pendiente si el modal se desmonta antes
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const totalUSD = numAmount * coin.current_price;
  const isBuy = type === 'buy';

  // Validation
  const maxBuy = walletBalance / coin.current_price;
  const isAmountValid = numAmount > 0;
  const hasSufficientFunds = isBuy ? totalUSD <= walletBalance : numAmount <= ownedAmount;
  const canSubmit = isAmountValid && hasSufficientFunds && !loading && !success;

  const setMax = () => {
    if (isBuy) {
      setAmount(maxBuy.toFixed(6));
    } else {
      setAmount(ownedAmount.toFixed(6));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isAmountValid) return setError('Ingresa una cantidad válida');
    if (!hasSufficientFunds) {
      return setError(isBuy ? 'Saldo insuficiente en tu wallet' : 'No tienes suficientes tokens para vender');
    }
    setLoading(true);
    try {
      await onConfirm(numAmount);
      setSuccess(isBuy ? `Compraste ${numAmount} ${coin.symbol} exitosamente` : `Vendiste ${numAmount} ${coin.symbol} exitosamente`);
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      const serverMessage = isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setError(serverMessage || 'Error en la operación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={cn(
          'px-8 pt-8 pb-6 border-b border-zinc-800 flex items-center justify-between',
          isBuy ? 'bg-emerald-500/5' : 'bg-rose-500/5'
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={cn('absolute inset-0 blur-xl rounded-full opacity-30', isBuy ? 'bg-emerald-500' : 'bg-rose-500')} />
              <CoinLogo symbol={coin.symbol} name={coin.name} image={coin.image} className="w-12 h-12 rounded-xl relative border border-zinc-800 bg-zinc-900 p-1" />
            </div>
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                {isBuy ? 'Comprar' : 'Vender'}
              </p>
              <h2 className="text-2xl font-black text-white tracking-tight">{coin.name}</h2>
              <p className="text-zinc-500 font-mono text-xs">{coin.symbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Price Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Precio Actual</p>
              <p className="text-white font-mono font-bold text-lg">
                ${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className={cn('text-xs font-bold flex items-center gap-1 mt-1', coin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(coin.price_change_percentage_24h).toFixed(2)}% (24h)
              </p>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
                {isBuy ? 'Saldo USD' : 'Tokens en cartera'}
              </p>
              <p className="text-white font-mono font-bold text-lg flex items-center gap-1">
                <Wallet size={14} className="text-zinc-400" />
                {isBuy
                  ? `$${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : `${ownedAmount.toFixed(6)} ${coin.symbol}`}
              </p>
              {isBuy && (
                <p className="text-zinc-600 text-[10px] font-bold mt-1">
                  Máx: {maxBuy.toFixed(6)} {coin.symbol}
                </p>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Cantidad ({coin.symbol})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={`0.000000`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-white font-mono text-lg outline-none transition-colors placeholder:text-zinc-700"
                  autoFocus
                  disabled={loading || !!success}
                />
                <button
                  type="button"
                  onClick={setMax}
                  disabled={loading || !!success}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-zinc-700 disabled:opacity-40"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Total preview */}
            {numAmount > 0 && (
              <div className={cn(
                'rounded-2xl p-4 border transition-all',
                hasSufficientFunds
                  ? isBuy ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                  : 'bg-rose-500/10 border-rose-500/30'
              )}>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm font-medium">
                    {isBuy ? 'Costo total' : 'Recibirás'}
                  </span>
                  <span className={cn(
                    'font-mono font-black text-xl',
                    hasSufficientFunds
                      ? isBuy ? 'text-emerald-400' : 'text-rose-400'
                      : 'text-rose-500'
                  )}>
                    ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {isBuy && !hasSufficientFunds && numAmount > 0 && (
                  <p className="text-rose-400 text-xs font-bold mt-2">
                    Faltan ${(totalUSD - walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} en tu wallet
                  </p>
                )}
                {!isBuy && !hasSufficientFunds && numAmount > 0 && (
                  <p className="text-rose-400 text-xs font-bold mt-2">
                    Solo tienes {ownedAmount.toFixed(6)} {coin.symbol}
                  </p>
                )}
              </div>
            )}

            {/* Error / Success messages */}
            {error && (
              <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                <CheckCircle2 size={16} className="shrink-0" />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed',
                isBuy
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
              )}
            >
              {loading
                ? 'Procesando...'
                : success
                  ? '✓ Listo'
                  : isBuy
                    ? `Comprar ${coin.symbol}`
                    : `Vender ${coin.symbol}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TradeModal;
