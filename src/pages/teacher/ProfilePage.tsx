import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { authApi } from '../../api/authApi';
import { apiErrorMessage } from '../../api/client';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  bio: z.string().optional(),
});

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const avatarInput = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user?.fullName || '', email: user?.email || '', bio: user?.bio || '' },
  });

  const onSubmit = async (data: { fullName: string; email: string; bio?: string }) => {
    try {
      const updated = await authApi.updateProfile(data);
      updateUser(updated);
      toast('success', 'Profil mis à jour');
    } catch (error) {
      toast('error', apiErrorMessage(error));
    }
  };

  const onAvatarChange = async (file?: File) => {
    if (!file) return;
    try {
      updateUser(await authApi.updateAvatar(file));
      toast('success', 'Photo de profil mise à jour');
    } catch (error) {
      toast('error', apiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mon profil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gérez vos informations personnelles</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || '')}&background=4F46E5&color=fff&size=80`}
              alt={user?.fullName}
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <button type="button" onClick={() => avatarInput.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={avatarInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => void onAvatarChange(event.target.files?.[0])} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{user?.fullName}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">
              {user?.role === 'ENSEIGNANT' ? 'Enseignant' : user?.role === 'ETUDIANT' ? 'Étudiant' : 'Admin'}
            </span>
          </div>
        </div>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit mb-5">
          {(['profile', 'password'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
              {t === 'profile' ? 'Profil' : 'Mot de passe'}
            </button>
          ))}
        </div>

        {activeTab === 'profile' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nom complet</label>
                <input {...register('fullName')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input {...register('email')} type="email" className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Bio</label>
              <textarea {...register('bio')} rows={3} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" />
            </div>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-60">
              <Save className="w-4 h-4" /> {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </form>
        ) : (
          <PasswordForm />
        )}
      </div>
    </div>
  );
}

function PasswordForm() {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setError, formState: { isSubmitting, errors } } = useForm<{ current: string; next: string; confirm: string }>();
  const onSubmit = async (data: { current: string; next: string; confirm: string }) => {
    if (data.next !== data.confirm) {
      setError('confirm', { message: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    try {
      await authApi.changePassword(data.current, data.next);
      toast('success', 'Mot de passe modifié');
      reset();
    } catch (error) {
      toast('error', apiErrorMessage(error));
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      {[['current', 'Mot de passe actuel'], ['next', 'Nouveau mot de passe'], ['confirm', 'Confirmer']].map(([n, l]) => (
        <div key={n}>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{l}</label>
          <input {...register(n as 'current')} type="password" className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
          {n === 'confirm' && <p className="text-red-500 text-[10px] mt-1">{errors.confirm?.message}</p>}
        </div>
      ))}
      <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-60">
        <Save className="w-4 h-4" /> Modifier
      </button>
    </form>
  );
}
