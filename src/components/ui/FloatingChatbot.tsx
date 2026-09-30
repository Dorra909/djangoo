import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 h-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold">Assistant IA</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-0.5 hover:bg-indigo-500 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ChatWindow />
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
}
