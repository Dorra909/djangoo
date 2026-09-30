import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { quizzesApi } from '../../api/quizzesApi';
import { Badge } from '../../components/ui/Badge';
import type { Quiz } from '../../types';

interface QuizResultsProps { quiz: Quiz; }

export function QuizResults({ quiz }: QuizResultsProps) {
  const { data: attempts = [] } = useQuery({ queryKey: ['quiz-attempts', quiz.id], queryFn: () => quizzesApi.getAttempts(quiz.id) });

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
    const rows = [['Étudiant', 'Score', 'Réussi', 'Date'], ...attempts.map(a => [a.studentName, `${a.score}%`, a.passed ? 'Oui' : 'Non', new Date(a.completedAt).toLocaleDateString('fr-FR')])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `resultats-${quiz.title}.csv`;
    a.click();
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Résultats détaillés</h3>
          {attempts.length > 0 && <button onClick={exportCSV} className="text-xs text-indigo-600 font-medium hover:underline">Exporter CSV</button>}
        </div>
        {attempts.length === 0 ? (
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
