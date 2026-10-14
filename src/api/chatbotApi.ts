import { apiClient, asArray } from './client';
import type { ChatMessage, ChatSession } from '../types';

export const chatbotApi = {
  async getSessions(): Promise<ChatSession[]> {
    const { data } = await apiClient.get<ChatSession[] | { results: ChatSession[] }>(
      '/chatbot/sessions/',
    );
    return asArray(data);
  },

  async createSession(courseId?: number): Promise<ChatSession> {
    const { data } = await apiClient.post<ChatSession>('/chatbot/sessions/', {
      ...(courseId ? { course_id: courseId } : {}),
    });
    return data;
  },

  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    const { data } = await apiClient.get<ChatMessage[] | { results: ChatMessage[] }>(
      `/chatbot/sessions/${sessionId}/messages/`,
    );
    return asArray(data);
  },

  async sendMessage(
    sessionId: number,
    content: string,
    courseId?: number,
  ): Promise<{
    session: ChatSession;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    quiz_draft?: import('./quizzesApi').QuizDraft;
    mock?: boolean;
  }> {
    const { data } = await apiClient.post(
      '/chatbot/message/',
      { session_id: sessionId, message: content, ...(courseId ? { course_id: courseId } : {}) },
    );
    return data;
  },

  async clearSession(sessionId: number): Promise<void> {
    await apiClient.delete(`/chatbot/sessions/${sessionId}/`);
  },
};
