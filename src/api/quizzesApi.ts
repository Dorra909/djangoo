import { mockQuizzes, mockAttempts } from '../mocks/data';
import type { Quiz, QuizAttempt } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let quizzes = [...mockQuizzes];
let attempts = [...mockAttempts];

export const quizzesApi = {
  async getAll(): Promise<Quiz[]> {
    await delay(400);
    return [...quizzes];
  },
  async getById(id: number): Promise<Quiz> {
    await delay(300);
    const q = quizzes.find(q => q.id === id);
    if (!q) throw new Error('Quiz non trouvé');
    return q;
  },
  async getByTeacher(teacherId: number): Promise<Quiz[]> {
    await delay(400);
    return quizzes.filter(q => q.teacherId === teacherId);
  },
  async create(data: Partial<Quiz>): Promise<Quiz> {
    await delay(600);
    const newQuiz: Quiz = { id: Date.now(), attemptCount: 0, createdAt: new Date().toISOString(), questions: [], title: '', courseId: 0, courseName: '', teacherId: 0, duration: 30, passingScore: 70, ...data } as Quiz;
    quizzes.push(newQuiz);
    return newQuiz;
  },
  async update(id: number, data: Partial<Quiz>): Promise<Quiz> {
    await delay(500);
    quizzes = quizzes.map(q => q.id === id ? { ...q, ...data } : q);
    return quizzes.find(q => q.id === id)!;
  },
  async delete(id: number): Promise<void> {
    await delay(400);
    quizzes = quizzes.filter(q => q.id !== id);
  },
  async getAttempts(quizId?: number, studentId?: number): Promise<QuizAttempt[]> {
    await delay(400);
    return attempts.filter(a => (!quizId || a.quizId === quizId) && (!studentId || a.studentId === studentId));
  },
  async submitAttempt(data: Omit<QuizAttempt, 'id' | 'passed' | 'score'>): Promise<QuizAttempt> {
    await delay(800);
    const quiz = quizzes.find(q => q.id === data.quizId)!;
    let correct = 0;
    data.answers.forEach((ans, i) => { if (ans === quiz.questions[i]?.correctAnswer) correct++; });
    const score = Math.round((correct / quiz.questions.length) * 100);
    const attempt: QuizAttempt = { ...data, id: Date.now(), score, passed: score >= quiz.passingScore };
    attempts.push(attempt);
    quizzes = quizzes.map(q => q.id === data.quizId ? { ...q, attemptCount: q.attemptCount + 1 } : q);
    return attempt;
  },
};
