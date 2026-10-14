import { apiClient, asArray } from './client';
import type { Progress } from '../types';

export const progressApi = {
  async getByStudent(_studentId: number): Promise<Progress[]> {
    const { data } = await apiClient.get<Progress[] | { results: Progress[] }>('/progress/mine/');
    return asArray(data);
  },

  async markLessonComplete(courseId: number, lessonId: number): Promise<Progress> {
    const { data } = await apiClient.post<Progress>(
      `/courses/${courseId}/lessons/${lessonId}/complete/`,
    );
    return data;
  },
};
