import { useCallback, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '../store/chatStore';
import { useWebSocket } from './useWebSocket';
import { iniciarSesionHTTP } from '../services/chatService';

export const useChat = () => {
  const { socket } = useWebSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const messages = useChatStore((state) => state.messages);
  const isTyping = useChatStore((state) => state.isTyping);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateLastMessage = useChatStore((state) => state.updateLastMessage);
  const setTyping = useChatStore((state) => state.setTyping);
  const reset = useChatStore((state) => state.reset);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleResponse = (data: any) => {
      if (data.is_final) {
        setTyping(false);
        if (data.score_riesgo >= 0.7) {
          addMessage({
            id: crypto.randomUUID(),
            remitente: 'ia',
            contenido: `Riesgo alto detectado: ${data.score_riesgo.toFixed(2)}`,
            timestamp: new Date().toISOString(),
            is_final: true,
          });
        }
      } else {
        updateLastMessage(data.chunk, false);
      }
    };

    const handleError = (payload: { message: string }) => {
      setError(payload.message);
      setTyping(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:response', handleResponse);
    socket.on('chat:error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:response', handleResponse);
      socket.off('chat:error', handleError);
    };
  }, [socket, addMessage, updateLastMessage, setTyping]);

  const enviarMensaje = useCallback(
    async (contenido: string) => {
      setError(null);
      const messageId = crypto.randomUUID();
      const message: ChatMessage = {
        id: messageId,
        remitente: 'usuario',
        contenido,
        timestamp: new Date().toISOString(),
      };
      addMessage(message);

      if (!socket || !sessionId) {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Debes iniciar sesión para enviar mensajes');
          return;
        }

        try {
          setTyping(true);
          const response = await iniciarSesionHTTP(contenido, token);
          setSessionId(response.sesion_id);
          addMessage({
            id: crypto.randomUUID(),
            remitente: 'ia',
            contenido: response.respuesta_ia,
            timestamp: response.timestamp,
            is_final: true,
          });
        } catch (err) {
          setError('No se pudo crear la sesión. Intenta de nuevo.');
        } finally {
          setTyping(false);
        }
        return;
      }

      setTyping(true);
      addMessage({
        id: crypto.randomUUID(),
        remitente: 'ia',
        contenido: '',
        timestamp: new Date().toISOString(),
        is_final: false,
      });

      socket.emit('chat:message', {
        sesion_id: sessionId,
        mensaje: contenido,
        timestamp: new Date().toISOString(),
      });
    },
    [socket, sessionId, addMessage, setTyping],
  );

  return {
    messages,
    isTyping,
    error,
    isConnected,
    sessionId,
    enviarMensaje,
    reset,
  };
};
