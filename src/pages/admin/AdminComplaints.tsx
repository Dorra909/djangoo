import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronRight, X } from 'lucide-react';
import { complaintsApi } from '../../api/complaintsApi';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import type { Complaint } from '../../types';
import { useForm } from 'react-hook-form';

const statusColors: Record<string, 'red' | 'amber' | 'emerald'> = {
  'Open': 'red', 'In progress': 'amber', 'Resolved': 'emerald',
};

export function AdminComplaints() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Complaint | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: complaints = [], isLoading } = useQuery({ queryKey: ['complaints'], queryFn: complaintsApi.getAll });
  const updateMut = useMutation({
    mutationFn: ({ id, status, reply }: { id: number; status: Complaint['status']; reply?: string }) =>
      complaintsApi.updateStatus(id, status, reply),
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey: ['complaints'] }); setSelected(updated); toast('success', 'Réclamation mise à jour'); },
  });

  const { register, handleSubmit, reset } = useForm<{ reply: string; status: Complaint['status'] }>();

  const filtered = complaints.filter(c => statusFilter === 'all' || c.status === statusFilter);

  const onUpdate = (data: { reply: string; status: Complaint['status'] }) => {
    if (!selected) return;
    updateMut.mutate({ id: selected.id, status: data.status, reply: data.reply });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gestion des réclamations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Traitez les réclamations des utilisateurs</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'Open', 'In progress', 'Resolved'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            {s === 'all' ? 'Tous' : s}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Aucune réclamation</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(c => (
                <button key={c.id} onClick={() => { setSelected(c); reset({ reply: c.adminReply || '', status: c.status }); }} className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selected?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-950' : ''}`}>
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.subject}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{c.authorName} · {new Date(c.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={statusColors[c.status]}>{c.status}</Badge>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{selected.subject}</h2>
                <p className="text-[10px] text-slate-500 mt-1">{selected.authorName} ({selected.authorRole}) · {new Date(selected.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              {selected.message}
            </div>
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Statut</label>
                <select {...register('status')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                  <option value="Open">Open</option>
                  <option value="In progress">In progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Réponse admin</label>
                <textarea {...register('reply')} rows={4} placeholder="Votre réponse..." className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" />
              </div>
              <button type="submit" disabled={updateMut.isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60">
                {updateMut.isPending ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Sélectionnez une réclamation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
