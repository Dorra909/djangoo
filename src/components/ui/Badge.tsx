interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'red' | 'slate' | 'blue';
}

const variants = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
  emerald: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  red: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  blue: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
};

export function Badge({ children, variant = 'slate' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}
