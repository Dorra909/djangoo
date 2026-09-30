import { MessageSquare } from 'lucide-react';
import { ChatWindow } from '../../components/ui/ChatWindow';

export function StudentChatbot() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Assistant IA</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Votre assistant d'étude personnel disponible 24h/24</p>
      </div>
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-violet-50 dark:bg-violet-950/30">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">StudyBot EduLearn</p>
            <p className="text-[10px] text-violet-600 dark:text-violet-400">● En ligne · Assistant d'étude IA</p>
          </div>
        </div>
        <div style={{ height: 'calc(70vh - 73px)', display: 'flex', flexDirection: 'column' }}>
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
