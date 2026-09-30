import { useNavigate } from 'react-router';
import { ShieldX } from 'lucide-react';

export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950 flex items-center justify-center mb-5">
        <ShieldX className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-2">403</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Vous n'avez pas les permissions pour accéder à cette page.</p>
      <button onClick={() => navigate(-1)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors">
        Retour
      </button>
    </div>
  );
}
