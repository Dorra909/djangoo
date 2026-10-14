import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, BarChart2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { quizzesApi } from '../../api/quizzesApi';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Quiz } from '../../types';
import type { QuizDraft } from '../../api/quizzesApi';
import { QuizForm } from './QuizForm';
import { QuizResults } from './QuizResults';
import { apiErrorMessage } from '../../api/client';

export function TeacherQuizzes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [deleting, setDeleting] = useState<Quiz | null>(null);
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);

  const { data: quizzes = [], isLoading, error } = useQuery({ queryKey: ['teacher-quizzes', user?.id], queryFn: () => quizzesApi.getByTeacher(user!.id) });
  const deleteMut = useMutation({ mutationFn: (id: number) => quizzesApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-quizzes'] }); toast('success', 'Quiz supprimé'); setDeleting(null); }, onError: error => toast('error', apiErrorMessage(error)) });

  useEffect(() => {
    const navigationDraft = (location.state as { quizDraft?: QuizDraft } | null)?.quizDraft;
    if (navigationDraft) {
      setDraft(navigationDraft);
      setEditing(null);
      setModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mes quiz</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{quizzes.length} quiz créés</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Créer un quiz
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger vos quiz.</div>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={Plus} title="Aucun quiz" description="Créez votre premier quiz pour évaluer vos étudiants." action={<button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl">Créer un quiz</button>} />
      ) : (
        <div className="space-y-3">
          {quizzes.map(q => (
            <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{q.questions.length}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{q.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{q.courseName} · {q.duration} min · Score min: {q.passingScore}%</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="slate">{q.attemptCount} tentatives</Badge>
                <button onClick={() => setResultsQuiz(q)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg transition-colors" title="Résultats">
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditing(q); setModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleting(q)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); setDraft(null); }} title={editing ? 'Modifier le quiz' : 'Créer un quiz'} size="xl">
        <QuizForm
          initial={editing}
          initialDraft={draft}
          teacherId={user!.id}
          onSuccess={async (data) => {
            try {
              if (editing) await quizzesApi.update(editing.id, data);
              else await quizzesApi.create(data);
              qc.invalidateQueries({ queryKey: ['teacher-quizzes'] });
              qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
              toast('success', editing ? 'Quiz modifié' : 'Quiz créé');
              setModalOpen(false); setEditing(null); setDraft(null);
            } catch (error) {
              toast('error', apiErrorMessage(error));
            }
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); setDraft(null); }}
        />
      </Modal>

      <Modal open={!!resultsQuiz} onClose={() => setResultsQuiz(null)} title={`Résultats: ${resultsQuiz?.title}`} size="lg">
        {resultsQuiz && <QuizResults quiz={resultsQuiz} />}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} title="Supprimer le quiz" message={`Supprimer "${deleting?.title}" ?`} confirmLabel="Supprimer" loading={deleteMut.isPending} />
    </div>
  );
}
