import { apiClient, asArray } from './client';
import type { Quiz, QuizAttempt, Question } from '../types';

export type QuizWrite = Omit<Partial<Quiz>, 'questions'> & { questions?: Partial<Question>[] };

export interface StartedQuizAttempt {
  id: number;
  quizId: number;
  startedAt: string;
  questions: Question[];
}

export interface QuizReview extends QuizAttempt {
  needsReview?: boolean;
  review: {
    questionId: number;
    selectedIndex: number;
    correctIndex: number;
    is_correct: boolean;
    explanation: string;
    textAnswer?: string;
    aiScore?: number | null;
    aiFeedback?: string;
    needsReview?: boolean;
    finalScore?: number;
  }[];
}

export interface QuizDraftQuestion extends Partial<Question> {
  options: string[];
  points: number;
  modelAnswer?: string;
  rubric?: string;
  source?: { documentId: number; page: number; title?: string } | null;
}

export interface QuizDraft {
  title: string;
  courseId?: number;
  creationMode: 'AI' | 'RAG';
  mock: boolean;
  questions: QuizDraftQuestion[];
}

export const quizzesApi = {
  async getAll(): Promise<Quiz[]> {
    const { data } = await apiClient.get<Quiz[] | { results: Quiz[] }>('/quizzes/');
    return asArray(data);
  },

  async getById(id: number): Promise<Quiz> {
    const { data } = await apiClient.get<Quiz>(`/quizzes/${id}/`);
    return data;
  },

  async getByTeacher(_teacherId: number): Promise<Quiz[]> {
    return this.getAll();
  },

  async create(data: QuizWrite): Promise<Quiz> {
    const { data: quiz } = await apiClient.post<Quiz>('/quizzes/', data);
    return quiz;
  },

  async generateDraft(data: {
    topic?: string;
    course_id?: number;
    num_questions: number;
    difficulty: string;
    types: string[];
    language: string;
    document_ids?: number[];
  }): Promise<QuizDraft> {
    const { data: response } = await apiClient.post<{ draft: QuizDraft }>('/quizzes/generate/', data);
    return response.draft;
  },

  async getPendingAnswers(quizId: number): Promise<{
    attemptId: number;
    answerId: number;
    studentName: string;
    answer: {
      questionId: number;
      textAnswer: string;
      aiScore: number | null;
      aiFeedback: string;
      needsReview: boolean;
      finalScore: number;
    };
    question: { text: string; points: number; modelAnswer: string; rubric: string };
  }[]> {
    const { data } = await apiClient.get(`/quizzes/${quizId}/attempts/pending/`);
    return data;
  },

  async overrideAnswer(attemptId: number, answerId: number, score: number) {
    const { data } = await apiClient.patch(
      `/attempts/${attemptId}/answers/${answerId}/override/`,
      { score },
    );
    return data;
  },

  async update(id: number, data: QuizWrite): Promise<Quiz> {
    const { data: quiz } = await apiClient.patch<Quiz>(`/quizzes/${id}/`, data);
    return quiz;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/quizzes/${id}/`);
  },

  async getAttempts(quizId?: number, studentId?: number): Promise<QuizAttempt[]> {
    const url = quizId
      ? `/quizzes/${quizId}/attempts/`
      : studentId
        ? '/quizzes/attempts/mine/'
        : '/quizzes/attempts/teacher/';
    const { data } = await apiClient.get<QuizAttempt[] | { results: QuizAttempt[] }>(url);
    return asArray(data);
  },

  async startAttempt(quizId: number): Promise<StartedQuizAttempt> {
    const { data } = await apiClient.post<StartedQuizAttempt>(`/quizzes/${quizId}/attempts/`);
    return data;
  },

  async submitAttempt(
    attemptId: number,
    answers: number[],
    timeTaken: number,
    textAnswers: { questionId: number; textAnswer: string }[] = [],
  ): Promise<QuizReview> {
    const { data } = await apiClient.post<QuizReview>(
      `/attempts/${attemptId}/submit/`,
      { answers, textAnswers, timeTaken },
    );
    return data;
  },

  async downloadResults(quizId: number, title: string): Promise<void> {
    const { data } = await apiClient.get<Blob>(`/quizzes/${quizId}/results-csv/`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `resultats-${title}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
