import { useQuery } from '@tanstack/react-query';
import { BookOpen, Award, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: dashboardApi.getStudent,
    meta: { onError: (queryError: unknown) => toast('error', apiErrorMessage(queryError)) },
  });
  const progress = data?.progress || [];
  const attempts = data?.attempts || [];
  const courses = data?.courses || [];

  const inProgress = progress.filter(p => p.percentage > 0 && p.percentage < 100);
  const avgScore = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percentage, 0) / progress.length) : 0;
  const quizPassed = attempts.filter(a => a.passed).length;

  const scoreHistory = attempts.slice(-6).map((a, i) => ({ attempt: `T${i + 1}`, score: a.score }));

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>;
  if (error || !data) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger le tableau de bord.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold">Bonjour, {user?.fullName?.split(' ')[0]} ! 👋</h1>
        <p className="text-indigo-200 text-sm mt-1">Continuez votre apprentissage, vous progressez bien !</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1 text-indigo-200">
            <span>Progression globale</span><span className="font-bold text-white">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-indigo-500/50 rounded-full">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cours en cours" value={inProgress.length} icon={BookOpen} color="indigo" />
        <StatCard title="Quiz réussis" value={quizPassed} icon={Award} color="emerald" />
        <StatCard title="Score moyen" value={`${avgScore}%`} icon={TrendingUp} color="amber" />
        <StatCard title="Progression" value={`${overallProgress}%`} icon={Target} color="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Continuer l'apprentissage</h2>
            <button onClick={() => navigate('/student/courses')} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
              Tous les cours <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            {inProgress.slice(0, 3).map(p => (
              <div key={p.courseId} className="cursor-pointer group" onClick={() => navigate(`/student/courses/${p.courseId}`)}>
                <div className="flex justify-between mb-1.5">
                  <p className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">{p.courseTitle}</p>
                  <span className="text-[10px] text-slate-500">{p.completedLessons}/{p.totalLessons} leçons</span>
                </div>
                <ProgressBar value={p.percentage} showPercent={false} size="sm" />
              </div>
            ))}
            {inProgress.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400">Inscrivez-vous à un cours pour commencer</p>
                <button onClick={() => navigate('/student/courses')} className="mt-2 text-xs text-indigo-600 hover:underline">Découvrir les cours</button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Évolution des scores</h2>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="attempt" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 4 }} name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">Passez des quiz pour voir votre évolution</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quiz disponibles</h2>
          <button onClick={() => navigate('/student/quizzes')} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
            Voir tous <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {courses.slice(0, 2).map(c => (
            <div key={c.id} onClick={() => navigate('/student/quizzes')} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <img src={c.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-200" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.title}</p>
                <p className="text-[10px] text-slate-500">{c.lessons.length} questions disponibles</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
