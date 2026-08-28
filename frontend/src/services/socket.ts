import { io, Socket } from 'socket.io-client';

const DEFAULT_BACKEND_URL = 'https://auction-websit.onrender.com';

const getSocketUrl = () => {
  if ((import.meta as any).env?.VITE_SOCKET_URL) {
    return (import.meta as any).env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    if (host.endsWith('netlify.app') || host.endsWith('vercel.app')) {
      return DEFAULT_BACKEND_URL;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const SOCKET_URL = getSocketUrl();

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('⚡ Connected to ELECTROBID Socket.IO server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
});
