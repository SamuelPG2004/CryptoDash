import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocketNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fix #3: send the JWT (not user.id) so the server can verify identity
    // before adding this socket to the private room.
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!socket) {
      socket = io();
    }
    socket.emit('auth', token);

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
