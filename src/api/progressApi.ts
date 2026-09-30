import { mockProgress } from '../mocks/data';
import type { Progress } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let progressData = [...mockProgress];

export const progressApi = {
  async getByStudent(_studentId: number): Promise<Progress[]> {
    await delay(400);
    return [...progressData];
  },
  async markLessonComplete(courseId: number, _lessonId: number): Promise<Progress> {
    await delay(300);
    progressData = progressData.map(p => {
      if (p.courseId !== courseId) return p;
      const completed = Math.min(p.completedLessons + 1, p.totalLessons);
      return { ...p, completedLessons: completed, percentage: Math.round((completed / p.totalLessons) * 100), lastAccessed: new Date().toISOString() };
    });
    return progressData.find(p => p.courseId === courseId)!;
  },
};
