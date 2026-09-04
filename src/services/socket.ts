import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getToken } from '../lib/tokenStorage';

// ─── Payloads tipados de los eventos del servidor ─────────────────────────────

/** Payload del evento 'alert' emitido por alertChecker en el backend */
export interface AlertNotification {
    symbol:       string;
    condition:    'above' | 'below';
    targetPrice:  number;
    currentPrice: number;
}

/** Payload del evento 'transaction' emitido tras una compra/venta */
export interface TransactionNotification {
    type: 'buy' | 'sell';
    transaction: {
        amount: number;
        symbol: string;
        price:  number;
    };
}

let socket: Socket | null = null;

export function useSocketNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // Logout: cerrar la conexión para no seguir suscrito a la sala privada
      socket?.disconnect();
      socket = null;
      return;
    }

    // Fix #3: send the JWT (not user.id) so the server can verify identity
    // before adding this socket to the private room.
    // Usar tokenStorage (clave 'auth_token') — la única fuente de verdad del JWT.
    const token = getToken();
    if (!token) return;

    if (!socket) {
      socket = io();
    }
    socket.emit('auth', token);

    const handleAlert = (data: AlertNotification) => {
      window.dispatchEvent(new CustomEvent<AlertNotification>('alert-notification', { detail: data }));
    };
    const handleTransaction = (data: TransactionNotification) => {
      window.dispatchEvent(new CustomEvent<TransactionNotification>('transaction-notification', { detail: data }));
    };
    socket.on('alert', handleAlert);
    socket.on('transaction', handleTransaction);

    return () => {
      socket?.off('alert', handleAlert);
      socket?.off('transaction', handleTransaction);
    };
  }, [user]);
}
