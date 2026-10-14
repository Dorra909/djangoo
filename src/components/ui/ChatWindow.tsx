import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Plus, Send, Bot, Trash2 } from 'lucide-react';
import { chatbotApi } from '../../api/chatbotApi';
import { coursesApi } from '../../api/coursesApi';
import { apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { ChatMessage } from '../../types';

const SUGGESTED = [
  'Comment fonctionne React Hooks?',
  'Aide-moi avec Python Pandas',
  'Explique CSS Flexbox',
  'Qu\'est-ce que TypeScript?',
];

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider dans votre apprentissage aujourd\'hui ?',
  timestamp: new Date(0).toISOString(),
};

export function ChatWindow() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | ''>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [quizDraft, setQuizDraft] = useState<import('../../api/quizzesApi').QuizDraft | null>(null);
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSessionStarted = useRef(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: courses = [] } = useQuery({
    queryKey: ['chat-courses', user?.role],
    queryFn: coursesApi.getAll,
  });
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useQuery({ queryKey: ['chat-sessions'], queryFn: chatbotApi.getSessions });
  const {
    data: storedMessages = [],
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => chatbotApi.getMessages(sessionId!),
    enabled: sessionId !== null,
  });

  const createSession = useMutation({
    mutationFn: (requestedCourseId?: number) => chatbotApi.createSession(requestedCourseId),
    onSuccess: session => {
      setSessionId(session.id);
      setCourseId(session.courseId ?? '');
      setRequestError('');
      void qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    onError: error => setRequestError(apiErrorMessage(error, 'Impossible de créer une conversation.')),
  });
  const sendMessage = useMutation({
    mutationFn: ({ id, content, course }: { id: number; content: string; course?: number }) =>
      chatbotApi.sendMessage(id, content, course),
    onSuccess: response => {
      setRequestError('');
      setQuizDraft(response.quiz_draft ?? null);
      void qc.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      void qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    onError: error => setRequestError(apiErrorMessage(error, 'Votre message n’a pas pu être envoyé.')),
    onSettled: () => setLoading(false),
  });
  const clearSession = useMutation({
    mutationFn: chatbotApi.clearSession,
    onSuccess: async () => {
      const remaining = sessions.filter(session => session.id !== sessionId);
      setSessionId(remaining[0]?.id ?? null);
      setCourseId(remaining[0]?.courseId ?? '');
      if (remaining.length === 0) createSession.mutate(courseId || undefined);
      await qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    onError: error => setRequestError(apiErrorMessage(error, 'Impossible de supprimer cette conversation.')),
  });

  useEffect(() => {
    if (sessionId !== null || sessionsLoading || sessionsError || initialSessionStarted.current) return;
    if (sessions[0]) {
      setSessionId(sessions[0].id);
      setCourseId(sessions[0].courseId ?? '');
    }
    else {
      initialSessionStarted.current = true;
      createSession.mutate(courseId || undefined);
    }
  }, [sessionId, sessions, sessionsLoading, sessionsError, createSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storedMessages, loading]);

  const messages = storedMessages.length ? storedMessages : [WELCOME];
  const activeCourseId = courseId || undefined;
  const send = (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading || sessionId === null) return;
    setInput('');
    setRequestError('');
    setLoading(true);
    sendMessage.mutate({ id: sessionId, content, course: courseId || undefined });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <select
          aria-label="Historique des conversations"
          value={sessionId ?? ''}
          onChange={event => {
            const session = sessions.find(item => item.id === Number(event.target.value));
            setSessionId(session?.id ?? null);
            setCourseId(session?.courseId ?? '');
            setQuizDraft(null);
          }}
          disabled={sessionsLoading || sessions.length === 0}
          className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
        >
          {sessions.length === 0 ? <option value="">Conversation</option> : sessions.map(session => (
            <option key={session.id} value={session.id}>{session.title}</option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Nouvelle conversation"
          disabled={createSession.isPending}
          onClick={() => createSession.mutate(courseId || undefined)}
          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
        {sessionId !== null && (
          <button
            type="button"
            aria-label="Effacer la conversation"
            disabled={clearSession.isPending}
            onClick={() => clearSession.mutate(sessionId)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <label className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
          Cours pour les réponses fondées sur les documents
          <select
            value={courseId}
            onChange={event => setCourseId(event.target.value ? Number(event.target.value) : '')}
            className="min-w-0 flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Aucun cours</option>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
      </div>
      {sessionsError || messagesError ? (
        <div role="alert" className="m-3 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-xs text-red-700 dark:text-red-300">
          {apiErrorMessage(sessionsError || messagesError)}
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(message => (
          <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              message.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
            }`}>
              {message.content}
              {message.sources?.length ? (
                <div className="mt-2 border-t border-slate-300/60 pt-2">
                  <p className="mb-1 font-semibold">Sources</p>
                  {message.sources.map((source, index) => (
                    <a
                      key={`${source.documentId}-${source.page}-${index}`}
                      href={`/${user?.role === 'ENSEIGNANT' ? 'teacher' : 'student'}/courses/${activeCourseId ?? ''}`}
                      className="block underline"
                    >
                      {source.title} — {source.courseTitle}, page {source.page}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

        ))}
        {quizDraft && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/40">
            <p className="text-xs font-semibold text-violet-900 dark:text-violet-100">{quizDraft.title}</p>
            <p className="mt-1 text-[10px] text-violet-700 dark:text-violet-300">{quizDraft.questions.length} question(s) générée(s). Relisez le brouillon dans le constructeur avant publication.</p>
            <button
              type="button"
              onClick={() => navigate('/teacher/quizzes', { state: { quizDraft } })}
              disabled={!quizDraft.courseId}
              className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
            >
              Ouvrir dans le constructeur
            </button>
          </div>
        )}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm text-xs text-slate-500">Réponse en cours…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {SUGGESTED.map(suggestion => (
            <button key={suggestion} onClick={() => send(suggestion)} className="text-[10px] px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors">
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3">
        {requestError && <p role="alert" className="mb-2 text-[10px] text-red-600">{requestError}</p>}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && send()}
            placeholder="Posez votre question..."
            disabled={sessionId === null || sessionsLoading || messagesLoading}
            className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || sessionId === null}
            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
