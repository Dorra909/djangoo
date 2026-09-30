import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '../../api/coursesApi';
import type { Quiz } from '../../types';

const questionSchema = z.object({
  text: z.string().min(5, 'Question requise'),
  type: z.enum(['multiple_choice', 'true_false']),
  options: z.array(z.string().min(1)).min(2),
  correctAnswer: z.number().min(0),
});

const schema = z.object({
  title: z.string().min(3, 'Titre requis'),
  courseId: z.number().min(1, 'Cours requis'),
  courseName: z.string(),
  duration: z.number().min(1),
  passingScore: z.number().min(0).max(100),
  questions: z.array(questionSchema).min(1),
});

type Form = z.infer<typeof schema>;

interface QuizFormProps {
  initial?: Quiz | null;
  teacherId: number;
  onSuccess: (data: Partial<Quiz>) => void;
  onCancel: () => void;
}

export function QuizForm({ initial, teacherId, onSuccess, onCancel }: QuizFormProps) {
  const { data: courses = [] } = useQuery({ queryKey: ['teacher-courses', teacherId], queryFn: () => coursesApi.getByTeacher(teacherId) });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title || '',
      courseId: initial?.courseId,
      courseName: initial?.courseName || '',
      duration: initial?.duration || 30,
      passingScore: initial?.passingScore || 70,
      questions: initial?.questions.map(q => ({ text: q.text, type: q.type, options: q.options, correctAnswer: q.correctAnswer })) || [
        { text: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const onSubmit = (data: Form) => {
    const course = courses.find(c => c.id === data.courseId);
    onSuccess({ ...data, courseName: course?.title || data.courseName, questions: data.questions.map((q, i) => ({ ...q, id: i + 1, explanation: '' })) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Titre du quiz</label>
          <input {...register('title')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cours associé</label>
          <select {...register('courseId', { valueAsNumber: true })} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
            <option value="">Choisir...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Durée (min)</label>
          <input {...register('duration', { valueAsNumber: true })} type="number" className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Score minimal (%)</label>
          <input {...register('passingScore', { valueAsNumber: true })} type="number" className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Questions ({fields.length})</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => append({ text: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: 0 })} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5" />QCM</button>
            <button type="button" onClick={() => append({ text: '', type: 'true_false', options: ['Vrai', 'Faux'], correctAnswer: 0 })} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Vrai/Faux</button>
          </div>
        </div>
        <div className="space-y-4">
          {fields.map((field, qi) => {
            const qtype = watch(`questions.${qi}.type`);
            return (
              <div key={field.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Q{qi + 1} · {qtype === 'true_false' ? 'Vrai/Faux' : 'QCM'}</span>
                  {fields.length > 1 && <button type="button" onClick={() => remove(qi)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
                <input {...register(`questions.${qi}.text`)} placeholder="Texte de la question..." className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                <div className="space-y-2">
                  {(qtype === 'true_false' ? ['Vrai', 'Faux'] : watch(`questions.${qi}.options`) || ['','','','']).map((_, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q${qi}_correct`}
                        checked={watch(`questions.${qi}.correctAnswer`) === oi}
                        onChange={() => setValue(`questions.${qi}.correctAnswer`, oi)}
                        className="accent-indigo-600"
                      />
                      {qtype === 'true_false' ? (
                        <span className="text-xs text-slate-700 dark:text-slate-300">{oi === 0 ? 'Vrai' : 'Faux'}</span>
                      ) : (
                        <input {...register(`questions.${qi}.options.${oi}`)} placeholder={`Option ${oi + 1}`} className="flex-1 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">Sélectionnez la bonne réponse avec le bouton radio</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Annuler</button>
        <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          {initial ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
