import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { progressApi } from '../../api/progressApi';
import { quizzesApi } from '../../api/quizzesApi';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';

export function StudentProgress() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'courses' | 'quizzes'>('courses');

  const { data: progress = [], isLoading: progressLoading, error: progressError } = useQuery({ queryKey: ['my-progress', user?.id], queryFn: () => progressApi.getByStudent(user!.id) });
  const { data: attempts = [], isLoading: attemptsLoading, error: attemptsError } = useQuery({ queryKey: ['my-attempts', user?.id], queryFn: () => quizzesApi.getAttempts(undefined, user!.id) });

  const scoreHistory = attempts.map((a, i) => ({ index: `T${i + 1}`, score: a.score, name: a.quizTitle }));
  const avgScore = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;
  const best = attempts.length ? Math.max(...attempts.map(a => a.score)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ma progression</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suivez votre avancement dans l'apprentissage</p>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {([['courses', 'Progression cours'], ['quizzes', 'Progression quiz']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {(progressError || attemptsError) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger votre progression.</div>}
      {tab === 'courses' ? (
        <div className="space-y-4">
          {progressLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Chargement...</div>
          ) : progress.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-400">
              Commencez un cours pour voir votre progression
            </div>
          ) : (
            progress.map(p => (
              <div key={p.courseId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{p.courseTitle}</h3>
                  <Badge variant={p.percentage === 100 ? 'emerald' : p.percentage > 50 ? 'amber' : 'slate'}>
                    {p.percentage === 100 ? 'Terminé' : 'En cours'}
                  </Badge>
                </div>
                <ProgressBar value={p.percentage} color={p.percentage === 100 ? 'emerald' : 'indigo'} />
                <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                  <span>{p.completedLessons} / {p.totalLessons} leçons complétées</span>
                  <span>Dernière activité: {p.lastAccessed ? new Date(p.lastAccessed).toLocaleDateString('fr-FR') : 'Aucune activité'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{attempts.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Tentatives</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{avgScore}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Score moyen</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{best}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Meilleur score</p>
            </div>
          </div>

          {attemptsLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Chargement...</div>
          ) : attempts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Évolution des scores</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="index" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 4 }} name="Score %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Historique des tentatives</h3>
            </div>
            {attempts.length === 0 ? (
              <p className="px-5 py-8 text-xs text-slate-400 text-center">Aucune tentative pour le moment</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...attempts].reverse().map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{a.quizTitle}</p>
                      <p className="text-[10px] text-slate-500">{new Date(a.completedAt).toLocaleDateString('fr-FR')} · {a.timeTaken} min</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{a.score}%</span>
                    <Badge variant={a.passed ? 'emerald' : 'red'}>{a.passed ? 'Réussi' : 'Échoué'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
