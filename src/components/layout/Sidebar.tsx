import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, BookOpen, FileQuestion, MessageSquare,
  AlertCircle, TrendingUp, User, X, GraduationCap, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/complaints', icon: AlertCircle, label: 'Réclamations' },
];

const teacherLinks = [
  { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/teacher/courses', icon: BookOpen, label: 'Mes cours' },
  { to: '/teacher/quizzes', icon: FileQuestion, label: 'Mes quiz' },
  { to: '/teacher/chatbot', icon: MessageSquare, label: 'Chatbot IA' },
  { to: '/teacher/complaints', icon: AlertCircle, label: 'Réclamations' },
  { to: '/profile', icon: User, label: 'Mon profil' },
];

const studentLinks = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/courses', icon: BookOpen, label: 'Cours' },
  { to: '/student/quizzes', icon: FileQuestion, label: 'Quiz' },
  { to: '/student/progress', icon: TrendingUp, label: 'Ma progression' },
  { to: '/student/chatbot', icon: MessageSquare, label: 'Chatbot IA' },
  { to: '/student/complaints', icon: AlertCircle, label: 'Réclamations' },
  { to: '/student/profile', icon: User, label: 'Mon profil' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'ADMIN' ? adminLinks : user?.role === 'ENSEIGNANT' ? teacherLinks : studentLinks;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed left-0 top-0 h-full z-30 w-64 flex flex-col
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ENSEIGNANT' ? '/teacher/dashboard' : '/student/dashboard')}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">EduLearn</span>
          </button>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">
            {user?.role === 'ADMIN' ? 'Administration' : user?.role === 'ENSEIGNANT' ? 'Enseignant' : 'Étudiant'}
          </span>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}
              `}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=4F46E5&color=fff`}
                alt={user.fullName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
