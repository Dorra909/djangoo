import { apiClient, asArray } from './client';
import type { Course, Lesson } from '../types';

export type CourseWrite = Omit<Partial<Course>, 'lessons'> & { lessons?: Partial<Lesson>[] };

export const coursesApi = {
  async getAll(): Promise<Course[]> {
    const { data } = await apiClient.get<Course[] | { results: Course[] }>('/courses/');
    return asArray(data);
  },

  async getById(id: number): Promise<Course> {
    const { data } = await apiClient.get<Course>(`/courses/${id}/`);
    return data;
  },

  async getByTeacher(_teacherId: number): Promise<Course[]> {
    const { data } = await apiClient.get<Course[] | { results: Course[] }>('/courses/');
    return asArray(data);
  },

  async getMyEnrollments(): Promise<number[]> {
    const { data } = await apiClient.get<{ courseId: number }[] | { results: { courseId: number }[] }>(
      '/courses/enrollments/mine/',
    );
    return asArray(data).map(enrollment => enrollment.courseId);
  },

  async create(data: CourseWrite): Promise<Course> {
    const { data: course } = await apiClient.post<Course>('/courses/', data);
    return course;
  },

  async update(id: number, data: CourseWrite): Promise<Course> {
    const { data: course } = await apiClient.patch<Course>(`/courses/${id}/`, data);
    return course;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/courses/${id}/`);
  },

  async enroll(id: number): Promise<void> {
    await apiClient.post(`/courses/${id}/enroll/`);
  },

  async setPublished(id: number, isPublished: boolean): Promise<Course> {
    const { data } = await apiClient.patch<Course>(`/courses/${id}/`, { isPublished });
    return data;
  },
};
