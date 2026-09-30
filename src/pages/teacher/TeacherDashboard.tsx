import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileQuestion, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../../components/ui/StatCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { coursesApi } from '../../api/coursesApi';
import { quizzesApi } from '../../api/quizzesApi';

export function TeacherDashboard() {
  const { user } = useAuth();
  const { data: courses = [], isLoading: lc } = useQuery({ queryKey: ['teacher-courses', user?.id], queryFn: () => coursesApi.getByTeacher(user!.id) });
  const { data: quizzes = [], isLoading: lq } = useQuery({ queryKey: ['teacher-quizzes', user?.id], queryFn: () => quizzesApi.getByTeacher(user!.id) });
  const { data: attempts = [] } = useQuery({ queryKey: ['all-attempts'], queryFn: () => quizzesApi.getAttempts() });

  const totalEnrolled = courses.reduce((a, c) => a + c.enrolledCount, 0);
  const avgScore = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;

  const chartData = courses.map(c => ({ name: c.title.substring(0, 20) + '...', étudiants: c.enrolledCount }));

  if (lc || lq) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bonjour, {user?.fullName?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Voici un aperçu de votre activité</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Mes cours" value={courses.length} icon={BookOpen} color="indigo" />
        <StatCard title="Mes quiz" value={quizzes.length} icon={FileQuestion} color="purple" />
        <StatCard title="Étudiants inscrits" value={totalEnrolled} icon={Users} color="emerald" change="+5% ce mois" changeType="up" />
        <StatCard title="Score moyen" value={`${avgScore}%`} icon={TrendingUp} color="amber" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Inscriptions par cours</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
            <Bar dataKey="étudiants" fill="#4F46E5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Mes cours récents</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {courses.slice(0,4).map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <img src={c.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.title}</p>
                  <p className="text-[10px] text-slate-500">{c.enrolledCount} étudiants · {c.lessons.length} leçons</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Mes quiz</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {quizzes.map(q => (
              <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                  <FileQuestion className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{q.title}</p>
                  <p className="text-[10px] text-slate-500">{q.attemptCount} tentatives · {q.questions.length} questions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
