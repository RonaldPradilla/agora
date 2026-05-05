import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatResponsePayload {
  sesion_id: string;
  chunk: string;
  is_final: boolean;
  score_riesgo?: number;
  timestamp: string;
}

export interface ChatErrorPayload {
  message: string;
}

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const wsUrl = (import.meta as any).env?.VITE_WS_URL ?? 'http://localhost:3000';
    const client = io(`${wsUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(client);

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, []);

  const disconnect = useCallback(() => {
    socket?.disconnect();
    setSocket(null);
  }, [socket]);

  return { socket, disconnect };
};
