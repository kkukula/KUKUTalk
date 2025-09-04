import { io, Socket } from 'socket.io-client';
import { API_BASE, getToken } from '@/api';

export function createSocket(): Socket {
  const token = getToken();
  return io(API_BASE, { transports: ['websocket'], auth: { token } });
}
