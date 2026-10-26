import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = window.location.origin;

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to CRAVE Real-Time Gateway, ID:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
