import { io, Socket } from 'socket.io-client';

export function createSocket(apiBase: string, token: string): Socket {
  // apiBase = http://localhost:3002
  const url = apiBase.replace(/\/+$/, '') + '/ws';
  return io(url, {
    transports: ['websocket'],
    auth: { token },
  });
}
