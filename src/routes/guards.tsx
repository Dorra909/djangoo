import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (user) {
    const redirect = user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'ENSEIGNANT' ? '/teacher/dashboard' : '/student/dashboard';
    return <Navigate to={redirect} replace />;
  }
  return <Outlet />;
}
