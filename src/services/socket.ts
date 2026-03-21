import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocketNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!socket) {
      socket = io();
    }
    socket.emit('auth', user.id);

    const handleAlert = (data: any) => {
      // Aquí puedes mostrar un toast o actualizar el estado global
      window.dispatchEvent(new CustomEvent('alert-notification', { detail: data }));
    };
    const handleTransaction = (data: any) => {
      window.dispatchEvent(new CustomEvent('transaction-notification', { detail: data }));
    };
    socket.on('alert', handleAlert);
    socket.on('transaction', handleTransaction);

    return () => {
      socket?.off('alert', handleAlert);
      socket?.off('transaction', handleTransaction);
    };
  }, [user]);
}
