export type Role = 'ADMIN' | 'ENSEIGNANT' | 'ETUDIANT';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  createdAt: string;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  videoUrl?: string;
  pdfUrl?: string;
  order: number;
  duration?: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  thumbnail?: string;
  teacherId: number;
  teacherName: string;
  lessons: Lesson[];
  enrolledCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  isPublished: boolean;
}

export interface Question {
  id: number;
  text: string;
  type: 'multiple_choice' | 'true_false';
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  id: number;
  title: string;
  courseId: number;
  courseName: string;
  teacherId: number;
  duration: number;
  passingScore: number;
  questions: Question[];
  attemptCount: number;
  createdAt: string;
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  quizTitle: string;
  studentId: number;
  studentName: string;
  score: number;
  passed: boolean;
  answers: number[];
  completedAt: string;
  timeTaken: number;
}

export interface Complaint {
  id: number;
  authorId: number;
  authorName: string;
  authorRole: Role;
  subject: string;
  category: string;
  message: string;
  attachment?: string;
  status: 'Open' | 'In progress' | 'Resolved';
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Progress {
  courseId: number;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  lastAccessed: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  totalQuizzes: number;
  openComplaints: number;
  newUsersPerMonth: { month: string; count: number }[];
  usersByRole: { name: string; value: number }[];
}
