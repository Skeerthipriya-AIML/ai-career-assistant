import { apiClient } from './api';

export const documentService = {
  async getDocuments() {
    const response = await apiClient.get('/chatbot/documents');
    return response.data;
  },
  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/chatbot/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  async deleteDocument(documentId: string) {
    const response = await apiClient.delete(`/chatbot/documents/${documentId}`);
    return response.data;
  },
  async reindexDocument(documentId: string) {
    const response = await apiClient.post(`/chatbot/reindex/${documentId}`);
    return response.data;
  },
  async getSummary(documentId: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    const response = await apiClient.post('/document/summarize', formData);
    return response.data;
  },
  async getMindMap(documentId: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    const response = await apiClient.post('/document/mind-map', formData);
    return response.data;
  },
  async explainParagraph(paragraph: string, tone: string) {
    const response = await apiClient.post('/document/explain-paragraph', {
      paragraph,
      tone,
    });
    return response.data;
  },
  async translateText(text: string, targetLanguage: string) {
    const response = await apiClient.post('/document/translate', {
      text,
      target_language: targetLanguage,
    });
    return response.data;
  },
  async getQuiz(documentId: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    const response = await apiClient.post('/document/quiz', formData);
    return response.data;
  },
  async getFlashcards(documentId: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    const response = await apiClient.post('/document/flashcards', formData);
    return response.data;
  },
  async getActionItems(documentId: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    const response = await apiClient.post('/document/extract-action-items', formData);
    return response.data;
  },
  async analyzeResume(documentId: string, jobDescription: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    formData.append('job_description', jobDescription);
    const response = await apiClient.post('/document/analyze-resume', formData);
    return response.data;
  },
  async askQuestion(documentId: string, question: string) {
    const formData = new FormData();
    formData.append('doc_id', documentId);
    formData.append('question', question);
    const response = await apiClient.post('/document/ask', formData);
    return response.data;
  },
  async compareDocuments(documentIdA: string, documentIdB: string) {
    const formData = new FormData();
    formData.append('doc_id_a', documentIdA);
    formData.append('doc_id_b', documentIdB);
    const response = await apiClient.post('/document/compare', formData);
    return response.data;
  },
};

