import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Menu, Sun, Moon, Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationsApi } from '../../api/notificationsApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../ui/Toast';

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Navbar({ onMenuClick, title }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: notifications = [], error: notificationsError } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
  });
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: error => toast('error', apiErrorMessage(error)),
  });
  const unreadCount = notifications.filter(notification => !notification.read).length;

  const profilePath = user?.role === 'ETUDIANT' ? '/student/profile' : '/profile';

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Menu className="w-5 h-5" />
      </button>

      {title && <h1 className="text-sm font-semibold text-slate-900 dark:text-white hidden sm:block">{title}</h1>}

      <div className="flex-1" />

      <button
        onClick={toggle}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
      </button>

      <div className="relative">
        <button onClick={() => setNotificationsOpen(open => !open)} aria-label="Notifications" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{unreadCount}</span>}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-30">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white">Notifications</div>
            {notificationsError ? (
              <p role="alert" className="p-4 text-xs text-red-600">Impossible de charger les notifications.</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-xs text-slate-400">Aucune notification.</p>
            ) : notifications.map(notification => (
              <button key={notification.id} onClick={() => !notification.read && markRead.mutate(notification.id)} className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${notification.read ? 'opacity-70' : ''}`}>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{notification.title}</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{notification.message}</p>
                <p className="mt-1 text-[9px] text-slate-400">{new Date(notification.createdAt).toLocaleString('fr-FR')}{!notification.read && ' · Nouveau'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'U')}&background=4F46E5&color=fff`}
            alt={user?.fullName}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:block max-w-24 truncate">{user?.fullName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-20 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { navigate(profilePath); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <User className="w-3.5 h-3.5" /> Mon profil
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-3.5 h-3.5" /> Déconnexion
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
