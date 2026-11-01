import { create } from 'zustand';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Array<{ filename: string; chunk_index: number; confidence: number }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  document_id?: string | null;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setLoading: (loading) => set({ loading }),
  addMessage: (sessionId, message) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
    ),
  })),
}));
