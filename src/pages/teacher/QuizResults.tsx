import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { quizzesApi } from '../../api/quizzesApi';
import { Badge } from '../../components/ui/Badge';
import type { Quiz } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { apiErrorMessage } from '../../api/client';

interface QuizResultsProps { quiz: Quiz; }

export function QuizResults({ quiz }: QuizResultsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<number, string>>({});
  const { data: attempts = [], error } = useQuery({ queryKey: ['quiz-attempts', quiz.id], queryFn: () => quizzesApi.getAttempts(quiz.id) });
  const { data: pendingAnswers = [], error: pendingError } = useQuery({
    queryKey: ['pending-quiz-answers', quiz.id],
    queryFn: () => quizzesApi.getPendingAnswers(quiz.id),
  });
  const override = useMutation({
    mutationFn: ({ attemptId, answerId, score }: { attemptId: number; answerId: number; score: number }) =>
      quizzesApi.overrideAnswer(attemptId, answerId, score),
    onSuccess: async () => {
      toast('success', 'Note enregistrée et résultat recalculé.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-quiz-answers', quiz.id] }),
        queryClient.invalidateQueries({ queryKey: ['quiz-attempts', quiz.id] }),
      ]);
    },
    onError: error => toast('error', apiErrorMessage(error)),
  });

  const buckets = [
    { range: '0–20%', count: attempts.filter(a => a.score <= 20).length },
    { range: '21–40%', count: attempts.filter(a => a.score > 20 && a.score <= 40).length },
    { range: '41–60%', count: attempts.filter(a => a.score > 40 && a.score <= 60).length },
    { range: '61–80%', count: attempts.filter(a => a.score > 60 && a.score <= 80).length },
    { range: '81–100%', count: attempts.filter(a => a.score > 80).length },
  ];

  const avgScore = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;
  const passRate = attempts.length ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0;

  const exportCSV = () => {
    void quizzesApi.downloadResults(quiz.id, quiz.title)
      .catch(downloadError => toast('error', apiErrorMessage(downloadError)));
  };

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{attempts.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Tentatives</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgScore}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Score moyen</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{passRate}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Taux de réussite</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Distribution des scores</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
            <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Étudiants" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-300">Réponses à relire</h3>
        {pendingError ? (
          <p role="alert" className="text-xs text-red-600">{apiErrorMessage(pendingError)}</p>
        ) : pendingAnswers.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 dark:bg-slate-800">Aucune réponse en attente de relecture.</p>
        ) : (
          <div className="space-y-3">
            {pendingAnswers.map(item => (
              <article key={item.answerId} className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.studentName} · {item.question.text}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">Réponse : {item.answer.textAnswer || 'Sans réponse'}</p>
                {item.answer.aiFeedback && <p className="text-xs text-slate-600 dark:text-slate-400">Retour IA : {item.answer.aiFeedback}</p>}
                {item.question.rubric && <p className="text-[10px] text-slate-500">Barème : {item.question.rubric}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[10px] text-slate-600 dark:text-slate-400">
                    Note / {item.question.points}
                    <input
                      type="number"
                      min="0"
                      max={item.question.points}
                      step="0.25"
                      value={scores[item.answerId] ?? String(item.answer.aiScore ?? 0)}
                      onChange={event => setScores(current => ({ ...current, [item.answerId]: event.target.value }))}
                      className="ml-2 w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={override.isPending}
                    onClick={() => override.mutate({
                      attemptId: item.attemptId,
                      answerId: item.answerId,
                      score: Number(scores[item.answerId] ?? item.answer.aiScore ?? 0),
                    })}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
                  >
                    Valider la note
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Résultats détaillés</h3>
          {attempts.length > 0 && <button onClick={exportCSV} className="text-xs text-indigo-600 font-medium hover:underline">Exporter CSV</button>}
        </div>
        {error ? (
          <p role="alert" className="text-xs text-red-600 text-center py-6">Impossible de charger les résultats.</p>
        ) : attempts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Aucune tentative pour ce quiz</p>
        ) : (
          <div className="space-y-2">
            {attempts.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-white">{a.studentName}</p>
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
  );
}
