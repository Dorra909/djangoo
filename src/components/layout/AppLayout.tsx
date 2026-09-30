import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { FloatingChatbot } from '../ui/FloatingChatbot';
import { useAuth } from '../../context/AuthContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const showChatbot = user?.role === 'ENSEIGNANT' || user?.role === 'ETUDIANT';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      {showChatbot && <FloatingChatbot />}
    </div>
  );
}
