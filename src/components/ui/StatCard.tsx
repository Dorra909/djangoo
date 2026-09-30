import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
  change?: string;
  changeType?: 'up' | 'down';
}

const colorMap = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
};

export function StatCard({ title, value, icon: Icon, color = 'indigo', change, changeType }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-medium ${changeType === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {changeType === 'up' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
