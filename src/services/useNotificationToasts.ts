import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import type { AlertNotification, TransactionNotification } from './socket';

export function useNotificationToasts() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleAlert = (e: Event) => {
      const { symbol, condition, targetPrice, currentPrice } =
        (e as CustomEvent<AlertNotification>).detail;
      showToast(
        `Alerta: ${symbol} ${condition === 'above' ? '≥' : '≤'} $${targetPrice} (actual: $${currentPrice})`,
        'info',
        6000
      );
    };
    const handleTransaction = (e: Event) => {
      const { type, transaction } = (e as CustomEvent<TransactionNotification>).detail;
      showToast(
        `Transacción: ${type === 'buy' ? 'Compra' : 'Venta'} de ${transaction.amount} ${transaction.symbol} a $${transaction.price}`,
        type === 'buy' ? 'success' : 'warning',
        6000
      );
    };
    window.addEventListener('alert-notification', handleAlert);
    window.addEventListener('transaction-notification', handleTransaction);
    return () => {
      window.removeEventListener('alert-notification', handleAlert);
      window.removeEventListener('transaction-notification', handleTransaction);
    };
  }, [showToast]);
}
