import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ||
  (window.location.origin.includes('5173')
    ? 'http://localhost:5000'
    : window.location.origin);

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('⚡ Connected to ELECTROBIT Socket.IO server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
});
