import { create } from 'zustand';

export interface DashboardMetrics {
  totalUsers: number;
  totalDocuments: number;
  totalChats: number;
  avgLatencyMs: number;
  totalTokensEstimated: number;
  systemHealth: string;
}

interface DashboardState {
  metrics: DashboardMetrics | null;
  loading: boolean;
  isCollapsed: boolean;
  setMetrics: (metrics: DashboardMetrics | null) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  loading: false,
  isCollapsed: false,
  setMetrics: (metrics) => set({ metrics }),
  setLoading: (loading) => set({ loading }),
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));
