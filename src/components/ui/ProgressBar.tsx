interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: 'indigo' | 'emerald' | 'amber';
  size?: 'sm' | 'md';
}

const colors = {
  indigo: 'bg-indigo-600',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

export function ProgressBar({ value, max = 100, label, showPercent = true, color = 'indigo', size = 'md' }: ProgressBarProps) {
  const pct = Math.round((value / max) * 100);
  const h = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>}
          {showPercent && <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${h} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
