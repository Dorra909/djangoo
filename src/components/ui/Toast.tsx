import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle };
  const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  };
  const iconColors = { success: 'text-emerald-600', error: 'text-red-600', warning: 'text-amber-600' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-xs pointer-events-auto ${colors[t.type]}`}>
              <Icon className={`w-4 h-4 shrink-0 ${iconColors[t.type]}`} />
              <span className="flex-1 font-medium text-xs">{t.message}</span>
              <button onClick={() => setToasts(x => x.filter(i => i.id !== t.id))} className="opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
