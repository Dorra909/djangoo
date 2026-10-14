import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute, RoleRoute, GuestRoute } from './guards';
import { LandingPage } from '../pages/public/LandingPage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { ForbiddenPage } from '../pages/public/ForbiddenPage';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { AdminComplaints } from '../pages/admin/AdminComplaints';
import { TeacherDashboard } from '../pages/teacher/TeacherDashboard';
import { TeacherCourses } from '../pages/teacher/TeacherCourses';
import { TeacherCourseDetail } from '../pages/teacher/TeacherCourseDetail';
import { TeacherQuizzes } from '../pages/teacher/TeacherQuizzes';
import { TeacherChatbot } from '../pages/teacher/TeacherChatbot';
import { TeacherComplaints } from '../pages/teacher/TeacherComplaints';
import { ProfilePage } from '../pages/teacher/ProfilePage';
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { StudentCourses, StudentCourseDetail } from '../pages/student/StudentCourses';
import { StudentQuizzes } from '../pages/student/StudentQuizzes';
import { StudentProgress } from '../pages/student/StudentProgress';
import { StudentChatbot } from '../pages/student/StudentChatbot';
import { StudentComplaints } from '../pages/student/StudentComplaints';
import { StudentProfile } from '../pages/student/StudentProfile';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Admin routes
          {
            element: <RoleRoute roles={['ADMIN']} />,
            children: [
              { path: '/admin/dashboard', element: <AdminDashboard /> },
              { path: '/admin/users', element: <AdminUsers /> },
              { path: '/admin/complaints', element: <AdminComplaints /> },
            ],
          },
          // Teacher routes
          {
            element: <RoleRoute roles={['ENSEIGNANT']} />,
            children: [
              { path: '/teacher/dashboard', element: <TeacherDashboard /> },
              { path: '/teacher/courses', element: <TeacherCourses /> },
              { path: '/teacher/courses/:id', element: <TeacherCourseDetail /> },
              { path: '/teacher/quizzes', element: <TeacherQuizzes /> },
              { path: '/teacher/chatbot', element: <TeacherChatbot /> },
              { path: '/teacher/complaints', element: <TeacherComplaints /> },
              { path: '/profile', element: <ProfilePage /> },
            ],
          },
          // Student routes
          {
            element: <RoleRoute roles={['ETUDIANT']} />,
            children: [
              { path: '/student/dashboard', element: <StudentDashboard /> },
              { path: '/student/courses', element: <StudentCourses /> },
              { path: '/student/courses/:id', element: <StudentCourseDetail /> },
              { path: '/student/quizzes', element: <StudentQuizzes /> },
              { path: '/student/progress', element: <StudentProgress /> },
              { path: '/student/chatbot', element: <StudentChatbot /> },
              { path: '/student/complaints', element: <StudentComplaints /> },
              { path: '/student/profile', element: <StudentProfile /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
