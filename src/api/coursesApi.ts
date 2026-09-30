import { mockCourses } from '../mocks/data';
import type { Course } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let courses = [...mockCourses];

export const coursesApi = {
  async getAll(): Promise<Course[]> {
    await delay(400);
    return [...courses];
  },
  async getById(id: number): Promise<Course> {
    await delay(300);
    const c = courses.find(c => c.id === id);
    if (!c) throw new Error('Cours non trouvé');
    return c;
  },
  async getByTeacher(teacherId: number): Promise<Course[]> {
    await delay(400);
    return courses.filter(c => c.teacherId === teacherId);
  },
  async create(data: Partial<Course>): Promise<Course> {
    await delay(600);
    const newCourse: Course = {
      id: Date.now(), enrolledCount: 0, rating: 0, reviewCount: 0,
      createdAt: new Date().toISOString(), isPublished: false, lessons: [],
      title: '', description: '', category: '', level: 'Débutant',
      teacherId: 0, teacherName: '',
      ...data,
    } as Course;
    courses.push(newCourse);
    return newCourse;
  },
  async update(id: number, data: Partial<Course>): Promise<Course> {
    await delay(500);
    courses = courses.map(c => c.id === id ? { ...c, ...data } : c);
    return courses.find(c => c.id === id)!;
  },
  async delete(id: number): Promise<void> {
    await delay(400);
    courses = courses.filter(c => c.id !== id);
  },
};
