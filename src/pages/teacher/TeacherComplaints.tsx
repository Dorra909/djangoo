import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle } from 'lucide-react';
import { complaintsApi } from '../../api/complaintsApi';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiErrorMessage } from '../../api/client';

const statusColors: Record<string, 'red' | 'amber' | 'emerald'> = { 'Open': 'red', 'In progress': 'amber', 'Resolved': 'emerald' };

const schema = z.object({
  subject: z.string().min(3, 'Sujet requis'),
  category: z.enum(['Technique', 'Pédagogie', 'Fonctionnalité', 'Autre']),
  message: z.string().min(10, 'Message requis (min 10 caractères)'),
  attachment: z.custom<FileList>().optional(),
});
type Form = z.infer<typeof schema>;

export function TeacherComplaints() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: complaints = [], isLoading, error } = useQuery({ queryKey: ['my-complaints', user?.id], queryFn: () => complaintsApi.getByAuthor(user!.id) });
  const createMut = useMutation({
    mutationFn: (data: Form) => complaintsApi.create({
      subject: data.subject,
      category: data.category,
      message: data.message,
      attachment: data.attachment?.[0],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-complaints'] }); toast('success', 'Réclamation envoyée'); setModalOpen(false); reset(); },
    onError: error => toast('error', apiErrorMessage(error)),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mes réclamations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suivez l'état de vos demandes</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nouvelle réclamation
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger vos réclamations.</div>
      ) : isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">Chargement...</div>
      ) : complaints.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Aucune réclamation pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{c.subject}</h3>
                    <Badge variant="slate">{c.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{c.message}</p>
                  {c.adminReply && (
                    <div className="mt-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-700">
                      <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">Réponse Admin</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{c.adminReply}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={statusColors[c.status]}>{c.status}</Badge>
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Nouvelle réclamation" size="md">
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Sujet</label>
            <input {...register('subject')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
            {errors.subject && <p className="text-red-500 text-[10px] mt-1">{errors.subject.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Catégorie</label>
            <select {...register('category')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
              <option>Technique</option>
              <option>Pédagogie</option>
              <option>Fonctionnalité</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Message</label>
            <textarea {...register('message')} rows={5} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" />
            {errors.message && <p className="text-red-500 text-[10px] mt-1">{errors.message.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pièce jointe (PDF, PNG ou JPEG, 5 Mo max.)</label>
            <input {...register('attachment')} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="w-full text-xs text-slate-600 dark:text-slate-300" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setModalOpen(false); reset(); }} className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Annuler</button>
            <button type="submit" disabled={isSubmitting || createMut.isPending} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-60">{createMut.isPending ? 'Envoi...' : 'Envoyer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
