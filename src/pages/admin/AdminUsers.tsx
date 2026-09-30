import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { usersApi } from '../../api/usersApi';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import type { User } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  fullName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  role: z.enum(['ENSEIGNANT', 'ETUDIANT']),
});
type UserForm = z.infer<typeof userSchema>;

type TabRole = 'ENSEIGNANT' | 'ETUDIANT';

export function AdminUsers() {
  const [tab, setTab] = useState<TabRole>('ENSEIGNANT');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });
  const filtered = users.filter(u => u.role === tab);

  const createMut = useMutation({ mutationFn: usersApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('success', 'Utilisateur créé'); setModalOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => usersApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('success', 'Modifié'); setModalOpen(false); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: (id: number) => usersApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('success', 'Supprimé'); setDeleting(null); } });
  const toggleMut = useMutation({ mutationFn: (id: number) => usersApi.toggleActive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: tab },
  });

  const openCreate = () => { setEditing(null); reset({ role: tab, fullName: '', email: '' }); setModalOpen(true); };
  const openEdit = (u: User) => { setEditing(u); reset({ fullName: u.fullName, email: u.email, role: u.role as 'ENSEIGNANT' | 'ETUDIANT' }); setModalOpen(true); };

  const onSubmit = (data: UserForm) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data as Partial<User>);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'fullName', label: 'Nom complet', sortable: true, render: row => (
      <div className="flex items-center gap-2.5">
        <img src={String(row.avatar || '')} alt="" className="w-7 h-7 rounded-full object-cover bg-slate-200" onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(row.fullName))}&background=4F46E5&color=fff&size=28`; }} />
        <span className="font-medium text-xs text-slate-900 dark:text-white">{String(row.fullName)}</span>
      </div>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'isActive', label: 'Statut', render: row => <Badge variant={row.isActive ? 'emerald' : 'red'}>{row.isActive ? 'Actif' : 'Inactif'}</Badge> },
    { key: 'createdAt', label: 'Inscription', render: row => new Date(String(row.createdAt)).toLocaleDateString('fr-FR') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gestion des utilisateurs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gérez les enseignants et étudiants</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(['ENSEIGNANT', 'ETUDIANT'] as TabRole[]).map(role => (
          <button key={role} onClick={() => setTab(role)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === role ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {role === 'ENSEIGNANT' ? 'Enseignants' : 'Étudiants'} ({users.filter(u => u.role === role).length})
          </button>
        ))}
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns}
        loading={isLoading}
        searchKeys={['fullName' as never, 'email' as never]}
        searchPlaceholder="Rechercher..."
        actions={row => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => toggleMut.mutate(Number(row.id))} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {row.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
            <button onClick={() => openEdit(row as unknown as User)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => setDeleting(row as unknown as User)} className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {[
            { name: 'fullName' as const, label: 'Nom complet', type: 'text' },
            { name: 'email' as const, label: 'Email', type: 'email' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{f.label}</label>
              <input {...register(f.name)} type={f.type} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
              {errors[f.name] && <p className="text-red-500 text-[10px] mt-1">{errors[f.name]?.message}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Rôle</label>
            <select {...register('role')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
              <option value="ETUDIANT">Étudiant</option>
              <option value="ENSEIGNANT">Enseignant</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => { setModalOpen(false); setEditing(null); }} className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-60">
              {isSubmitting ? '...' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer ${deleting?.fullName} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={deleteMut.isPending}
      />
    </div>
  );
}
