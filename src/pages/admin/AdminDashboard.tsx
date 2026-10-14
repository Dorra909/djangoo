import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, FileQuestion, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatCard } from '../../components/ui/StatCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { dashboardApi } from '../../api/dashboardApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

export function AdminDashboard() {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardApi.getAdmin,
    meta: { onError: (queryError: unknown) => toast('error', apiErrorMessage(queryError)) },
  });
  const stats = data?.stats;
  const recentComplaints = data?.recentComplaints || [];

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i) => <CardSkeleton key={i} />)}</div>;
  if (error || !stats) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger le tableau de bord.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Administrateur</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Vue d'ensemble de la plateforme</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total utilisateurs" value={stats!.totalUsers} icon={Users} color="indigo" change="+12% ce mois" changeType="up" />
        <StatCard title="Enseignants" value={stats!.totalTeachers} icon={UserCheck} color="emerald" />
        <StatCard title="Étudiants" value={stats!.totalStudents} icon={Users} color="blue" change="+8%" changeType="up" />
        <StatCard title="Cours" value={stats!.totalCourses} icon={BookOpen} color="purple" />
        <StatCard title="Quiz" value={stats!.totalQuizzes} icon={FileQuestion} color="amber" />
        <StatCard title="Réclamations ouvertes" value={stats!.openComplaints} icon={AlertCircle} color="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Nouveaux utilisateurs par mois</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats!.newUsersPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 4 }} name="Inscriptions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Répartition par rôle</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats!.usersByRole} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {stats!.usersByRole.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Réclamations récentes</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentComplaints.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.subject}</p>
                <p className="text-[10px] text-slate-500">{c.authorName} · {c.authorRole}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                c.status === 'Open' ? 'bg-red-50 text-red-600' :
                c.status === 'In progress' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
