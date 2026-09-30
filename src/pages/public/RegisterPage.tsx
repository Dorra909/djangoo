import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Loader2 } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useToast } from '../../components/ui/Toast';

const schema = z.object({
  fullName: z.string().min(2, 'Nom complet requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe: 8 caractères minimum'),
  confirmPassword: z.string(),
  role: z.enum(['ENSEIGNANT', 'ETUDIANT']),
}).refine(d => d.password === d.confirmPassword, { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] });

type Form = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'ETUDIANT' },
  });

  const onSubmit = async (data: Form) => {
    setError('');
    try {
      await authApi.register(data);
      toast('success', 'Compte créé avec succès !');
      navigate('/login');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-xl">EduLearn</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Créer un compte</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Déjà inscrit? <Link to="/login" className="text-indigo-600 hover:underline font-medium">Se connecter</Link>
        </p>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs">
                {error}
              </div>
            )}
            {[
              { name: 'fullName' as const, label: 'Nom complet', type: 'text', placeholder: 'Jean Dupont' },
              { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'jean@exemple.com' },
              { name: 'password' as const, label: 'Mot de passe', type: 'password', placeholder: '••••••••' },
              { name: 'confirmPassword' as const, label: 'Confirmer le mot de passe', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{f.label}</label>
                <input
                  {...register(f.name)}
                  type={f.type}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
                {errors[f.name] && <p className="text-red-500 text-[10px] mt-1">{errors[f.name]?.message}</p>}
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Je suis</label>
              <div className="grid grid-cols-2 gap-3">
                {(['ETUDIANT', 'ENSEIGNANT'] as const).map(role => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input {...register('role')} type="radio" value={role} className="accent-indigo-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{role === 'ETUDIANT' ? 'Étudiant' : 'Enseignant'}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Inscription...' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
