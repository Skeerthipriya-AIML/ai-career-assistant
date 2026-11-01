import { apiClient } from './api';

export const interviewService = {
  async getSessions() {
    const response = await apiClient.get('/coach/sessions');
    return response.data;
  },
  async getQuestion(type: string, company?: string) {
    const response = await apiClient.post('/coach/question', {
      type,
      company: company || 'General',
    });
    return response.data;
  },
  async submitAnswer(payload: {
    question_id: string;
    question_text: string;
    question_type: string;
    answer_text?: string;
    audio_base64?: string;
    session_id?: string;
  }) {
    const formData = new FormData();
    formData.append('question_id', payload.question_id);
    formData.append('question_text', payload.question_text);
    formData.append('question_type', payload.question_type);
    formData.append('answer_text', payload.answer_text || '');
    if (payload.audio_base64) {
      formData.append('audio_base64', payload.audio_base64);
    }
    if (payload.session_id) {
      formData.append('session_id', payload.session_id);
    }
    const response = await apiClient.post('/coach/submit-answer', formData);
    return response.data;
  },
  async scanResumeATS(file: File, jobDescription: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);
    const response = await apiClient.post('/coach/ats-score', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

