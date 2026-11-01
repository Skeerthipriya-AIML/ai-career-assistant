import { create } from 'zustand';
import { authService } from '../services/auth';
import { apiClient } from '../services/api';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  role: string;
  is_verified: boolean;
  onboarded: boolean;
  career_goal?: string;
  skills: string[];
  preferred_companies: string[];
  bio?: string;
  education?: string;
  github_link?: string;
  linkedin_link?: string;
  created_at: string;
}

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  setUser: (user: UserResponse | null) => void;
  setToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  login: (credentials: any) => Promise<void>;
  registerUser: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  oauthLogin: (provider: string, token: string, email?: string, name?: string, avatar?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password_plain: string) => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: !!localStorage.getItem('token'),
  error: null,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  setError: (error) => set({ error }),

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.login(credentials);
      get().setToken(data.access_token);
      set({ user: data.user, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  registerUser: async (userData) => {
    set({ loading: true, error: null });
    try {
      await authService.register(userData);
      set({ loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      const token = get().token;
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      get().setToken(null);
      set({ user: null, loading: false, error: null });
    }
  },

  oauthLogin: async (provider, token, email, name, avatar) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/auth/oauth', {
        provider,
        token,
        email,
        name,
        avatar
      });
      get().setToken(response.data.access_token);
      set({ user: response.data.user, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'OAuth authentication failed.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  verifyEmail: async (verificationToken) => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/auth/verify-email', { token: verificationToken });
      set({ loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Verification failed.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/auth/forgot-password', { email });
      set({ loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to dispatch reset request.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  resetPassword: async (resetToken, password_plain) => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/auth/reset-password', { token: resetToken, password: password_plain });
      set({ loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to override password.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  updateProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.patch('/users/profile', profileData);
      set({ user: response.data, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Profile update failed.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  deleteAccount: async () => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete('/users/account');
      get().setToken(null);
      set({ user: null, loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Account deletion failed.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const data = await authService.getMe();
      set({ user: data, loading: false });
    } catch (err) {
      console.error('CheckAuth token validation failed', err);
      get().setToken(null);
      set({ user: null, loading: false });
    }
  }
}));
