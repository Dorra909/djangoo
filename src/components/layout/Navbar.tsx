import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Menu, Sun, Moon, Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Navbar({ onMenuClick, title }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

      <button className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
        <Bell className="w-4.5 h-4.5" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>

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
