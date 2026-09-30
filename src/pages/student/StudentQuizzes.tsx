import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Clock, CheckCircle, XCircle, Timer, ChevronRight, Trophy } from 'lucide-react';
import { quizzesApi } from '../../api/quizzesApi';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import type { Quiz, QuizAttempt } from '../../types';

export function StudentQuizzes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taking, setTaking] = useState<Quiz | null>(null);
  const [result, setResult] = useState<QuizAttempt | null>(null);

  const { data: quizzes = [], isLoading } = useQuery({ queryKey: ['quizzes'], queryFn: quizzesApi.getAll });
  const { data: attempts = [] } = useQuery({ queryKey: ['my-attempts', user?.id], queryFn: () => quizzesApi.getAttempts(undefined, user!.id) });

  const submitMut = useMutation({
    mutationFn: (data: Omit<QuizAttempt, 'id' | 'passed' | 'score'>) => quizzesApi.submitAttempt(data),
    onSuccess: (attempt) => { setTaking(null); setResult(attempt); toast(attempt.passed ? 'success' : 'warning', attempt.passed ? 'Quiz réussi !' : 'Quiz non réussi'); },
  });

  if (taking) return <QuizPlayer quiz={taking} studentId={user!.id} studentName={user!.fullName} onSubmit={d => submitMut.mutate(d)} onCancel={() => setTaking(null)} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Quiz disponibles</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{quizzes.length} quiz pour tester vos connaissances</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(q => {
            const myAttempts = attempts.filter(a => a.quizId === q.id);
            const best = myAttempts.length ? Math.max(...myAttempts.map(a => a.score)) : null;

            return (
              <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{q.questions.length}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{q.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{q.courseName}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{q.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Score min: {q.passingScore}%</span>
                      </div>
                      {best !== null && (
                        <Badge variant={best >= q.passingScore ? 'emerald' : 'red'}>
                          Meilleur: {best}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setTaking(q)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                  >
                    {myAttempts.length > 0 ? 'Réessayer' : 'Commencer'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!result} onClose={() => setResult(null)} title="Résultat du quiz" size="sm">
        {result && (
          <div className="p-5 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${result.passed ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
              {result.passed ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{result.score}%</h3>
            <p className={`text-sm font-semibold mb-2 ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>{result.passed ? '🎉 Quiz réussi !' : '😕 Score insuffisant'}</p>
            <p className="text-xs text-slate-500 mb-5">{result.quizTitle}</p>
            <button onClick={() => setResult(null)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">Fermer</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface QuizPlayerProps {
  quiz: Quiz;
  studentId: number;
  studentName: string;
  onSubmit: (data: Omit<QuizAttempt, 'id' | 'passed' | 'score'>) => void;
  onCancel: () => void;
}

function QuizPlayer({ quiz, studentId, studentName, onSubmit, onCancel }: QuizPlayerProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(quiz.questions.length).fill(-1));
  const [startTime] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);

  const q = quiz.questions[current];
  const answered = answers.filter(a => a !== -1).length;

  const handleSubmit = () => {
    const timeTaken = Math.round((Date.now() - startTime) / 60000);
    onSubmit({
      quizId: quiz.id, quizTitle: quiz.title, studentId, studentName,
      answers: answers.map(a => a === -1 ? 0 : a),
      completedAt: new Date().toISOString(), timeTaken,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700">← Abandonner</button>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{quiz.duration} min max</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Question {current + 1} / {quiz.questions.length}</span>
          <span>{answered} répondu(s)</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <p className="text-base font-semibold text-slate-900 dark:text-white mb-6">{q.text}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setAnswers(prev => { const n = [...prev]; n[current] = i; return n; })}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-sm text-left transition-all ${answers[current] === i ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[current] === i ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                {answers[current] === i && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-between">
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40">
          Précédent
        </button>
        {current < quiz.questions.length - 1 ? (
          <button onClick={() => setCurrent(c => c + 1)} className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
            Suivant
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors">
            Soumettre ({answered}/{quiz.questions.length})
          </button>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Soumettre le quiz ?</h3>
            <p className="text-xs text-slate-500 mb-5">Vous avez répondu à {answered} questions sur {quiz.questions.length}. Confirmez-vous la soumission ?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirming(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200">Annuler</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
