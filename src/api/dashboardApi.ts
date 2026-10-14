import { apiClient } from './client';
import type { Complaint, Course, DashboardStats, Progress, Quiz, QuizAttempt } from '../types';

export interface AdminDashboardData {
  stats: DashboardStats;
  recentComplaints: Complaint[];
}

export interface TeacherDashboardData {
  courses: Course[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
}

export interface StudentDashboardData {
  progress: Progress[];
  attempts: QuizAttempt[];
  courses: Course[];
  quizzes: Quiz[];
}

export const dashboardApi = {
  async getAdmin(): Promise<AdminDashboardData> {
    const { data } = await apiClient.get<AdminDashboardData>('/dashboard/admin/');
    return data;
  },

  async getTeacher(): Promise<TeacherDashboardData> {
    const { data } = await apiClient.get<TeacherDashboardData>('/dashboard/teacher/');
    return data;
  },

  async getStudent(): Promise<StudentDashboardData> {
    const { data } = await apiClient.get<StudentDashboardData>('/dashboard/student/');
    return data;
  },
};
