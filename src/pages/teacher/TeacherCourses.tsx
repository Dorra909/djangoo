import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { coursesApi } from '../../api/coursesApi';
import { CourseCard } from '../../components/ui/CourseCard';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Course } from '../../types';
import { CourseForm } from './CourseForm';

export function TeacherCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const { data: courses = [], isLoading } = useQuery({ queryKey: ['teacher-courses', user?.id], queryFn: () => coursesApi.getByTeacher(user!.id) });
  const deleteMut = useMutation({ mutationFn: (id: number) => coursesApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-courses'] }); toast('success', 'Cours supprimé'); setDeleting(null); } });

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mes cours</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{courses.length} cours créés</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Créer un cours
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cours..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400" />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length:3}).map((_,i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Plus} title="Aucun cours" description="Créez votre premier cours pour commencer à enseigner." action={<button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl">Créer un cours</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              basePath="/teacher/courses"
              actions={
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/teacher/courses/${course.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Voir
                  </button>
                  <button onClick={() => { setEditing(course); setModalOpen(true); }} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleting(course)} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Modifier le cours' : 'Créer un cours'} size="lg">
        <CourseForm
          initial={editing}
          onSuccess={(course) => {
            if (editing) {
              coursesApi.update(editing.id, { ...course, teacherId: user!.id, teacherName: user!.fullName });
            } else {
              coursesApi.create({ ...course, teacherId: user!.id, teacherName: user!.fullName });
            }
            qc.invalidateQueries({ queryKey: ['teacher-courses'] });
            toast('success', editing ? 'Cours modifié' : 'Cours créé');
            setModalOpen(false);
            setEditing(null);
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="Supprimer le cours"
        message={`Êtes-vous sûr de vouloir supprimer "${deleting?.title}" ?`}
        confirmLabel="Supprimer"
        loading={deleteMut.isPending}
      />
    </div>
  );
}
