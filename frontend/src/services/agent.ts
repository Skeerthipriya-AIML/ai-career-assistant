import { apiClient } from './api';

export const agentService = {
  async runAgent(prompt: string) {
    const formData = new FormData();
    formData.append('prompt', prompt);
    const response = await apiClient.post('/agent/execute', formData);
    return response.data;
  },
  async cancelExecution(executionId: string) {
    const response = await apiClient.post(`/agent/cancel/${executionId}`);
    return response.data;
  },
};

