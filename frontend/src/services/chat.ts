import { apiClient } from './api';

export const chatService = {
  async getSessions() {
    const response = await apiClient.get('/chatbot/sessions');
    return response.data;
  },
  async createSession(title: string, documentId?: string | null) {
    const response = await apiClient.post('/chatbot/sessions', {
      title,
      document_id: documentId || null,
    });
    return response.data;
  },
  async getSessionMessages(sessionId: string) {
    const response = await apiClient.get(`/chatbot/sessions/${sessionId}/messages`);
    return response.data;
  },
  async sendMessage(sessionId: string, message: string) {
    const response = await apiClient.post(`/chatbot/sessions/${sessionId}/messages`, {
      message,
    });
    return response.data;
  },
};
