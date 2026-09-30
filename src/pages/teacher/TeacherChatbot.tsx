import { MessageSquare } from 'lucide-react';
import { ChatWindow } from '../../components/ui/ChatWindow';

export function TeacherChatbot() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Assistant IA</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Interagissez avec votre assistant pédagogique IA</p>
      </div>
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-950">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Assistant EduLearn</p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400">● En ligne · Aide à la préparation des cours</p>
          </div>
        </div>
        <div className="flex-1" style={{ height: 'calc(70vh - 73px)', display: 'flex', flexDirection: 'column' }}>
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
