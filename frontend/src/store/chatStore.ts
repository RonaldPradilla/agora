import { create } from 'zustand';

export type ChatMessage = {
  id: string;
  remitente: 'usuario' | 'ia';
  contenido: string;
  timestamp: string;
  is_final?: boolean;
};

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string, isFinal?: boolean) => void;
  setTyping: (value: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (chunk, isFinal = false) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (!last) return { messages };
      messages[messages.length - 1] = { ...last, contenido: last.contenido + chunk, is_final: isFinal };
      return { messages };
    }),
  setTyping: (value) => set({ isTyping: value }),
  reset: () => set({ messages: [], isTyping: false }),
}));
