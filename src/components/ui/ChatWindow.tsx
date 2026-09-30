import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { chatbotApi } from '../../api/chatbotApi';
import type { ChatMessage } from '../../types';

const SUGGESTED = [
  'Comment fonctionne React Hooks?',
  'Aide-moi avec Python Pandas',
  'Explique CSS Flexbox',
  'Qu\'est-ce que TypeScript?',
];

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider dans votre apprentissage aujourd\'hui ?', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const response = await chatbotApi.sendMessage(content, messages);
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)} className="text-[10px] px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Posez votre question..."
            className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
