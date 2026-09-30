import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type Form = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { email: 'admin@demo.com', label: 'Admin', color: 'indigo' },
  { email: 'teacher@demo.com', label: 'Enseignant', color: 'emerald' },
  { email: 'student@demo.com', label: 'Étudiant', color: 'amber' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError('');
    try {
      await login(data.email, data.password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-600 items-center justify-center p-12">
        <div className="relative z-10 text-white max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-8">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4">Bienvenue sur EduLearn</h2>
          <p className="text-indigo-200 leading-relaxed">Connectez-vous pour accéder à vos cours, quiz et suivre votre progression d'apprentissage.</p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=1000&fit=crop&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-xl">EduLearn</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Connexion</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Pas encore de compte? <Link to="/register" className="text-indigo-600 hover:underline font-medium">S'inscrire</Link>
          </p>

          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 mb-6">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Comptes démo (mot de passe: demo1234)</p>
            <div className="flex gap-2 flex-wrap">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setValue('email', acc.email); setValue('password', 'demo1234'); }}
                  className="text-xs px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors font-medium"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="votre@email.com"
                className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[10px] mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
