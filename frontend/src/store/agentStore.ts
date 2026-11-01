import { create } from 'zustand';

export interface AgentStep {
  step: number;
  thought: string;
  tool: string | null;
  tool_input: string | null;
  observation: string | null;
}

export interface AgentRunResponse {
  output: string;
  success: boolean;
  steps: AgentStep[];
  plan?: string;
  iterations: number;
}

interface AgentState {
  history: AgentRunResponse[];
  activeRun: AgentRunResponse | null;
  loading: boolean;
  setHistory: (history: AgentRunResponse[]) => void;
  setActiveRun: (run: AgentRunResponse | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  history: [],
  activeRun: null,
  loading: false,
  setHistory: (history) => set({ history }),
  setActiveRun: (activeRun) => set({ activeRun }),
  setLoading: (loading) => set({ loading }),
}));
