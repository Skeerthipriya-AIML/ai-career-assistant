import { apiClient } from './api';

export const authService = {
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  async login(payload: any) {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },
  async register(payload: any) {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },
};
