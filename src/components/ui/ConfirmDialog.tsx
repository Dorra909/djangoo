import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
