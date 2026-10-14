import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { coursesApi } from '../../api/coursesApi';
import { documentsApi } from '../../api/documentsApi';
import { apiErrorMessage } from '../../api/client';
import { quizzesApi } from '../../api/quizzesApi';
import type { Quiz } from '../../types';
import type { QuizDraft, QuizWrite } from '../../api/quizzesApi';

const questionSchema = z.object({
  text: z.string().trim().min(5, 'Question requise'),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  options: z.array(z.string().trim()),
  correctAnswer: z.number().optional(),
  explanation: z.string().optional(),
  points: z.number().min(0.01).max(100),
  modelAnswer: z.string().optional(),
  rubric: z.string().optional(),
  source: z.object({
    documentId: z.number(),
    page: z.number(),
    title: z.string().optional(),
  }).nullable().optional(),
}).superRefine((question, context) => {
  if (question.type === 'short_answer') {
    if (!question.modelAnswer?.trim()) {
      context.addIssue({ code: 'custom', path: ['modelAnswer'], message: 'Réponse modèle requise' });
    }
  } else if (
    question.options.filter(option => option.trim()).length < 2
    || question.correctAnswer === undefined
    || question.correctAnswer >= question.options.length
  ) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Ajoutez au moins deux choix et indiquez la bonne réponse.' });
  }
});

const schema = z.object({
  title: z.string().trim().min(3, 'Titre requis'),
  courseId: z.number().min(1, 'Cours requis'),
  courseName: z.string(),
  duration: z.number().min(1),
  passingScore: z.number().min(0).max(100),
  creationMode: z.enum(['MANUAL', 'AI', 'RAG']),
  gradingMode: z.enum(['AUTO', 'AI', 'MANUAL']),
  questions: z.array(questionSchema).min(1),
});

type Form = z.infer<typeof schema>;
type GenerationMode = 'AI' | 'RAG';

interface QuizFormProps {
  initial?: Quiz | null;
  initialDraft?: QuizDraft | null;
  teacherId: number;
  onSuccess: (data: QuizWrite) => void;
  onCancel: () => void;
}

const controlClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export function QuizForm({ initial, initialDraft, teacherId, onSuccess, onCancel }: QuizFormProps) {
  const [generationMode, setGenerationMode] = useState<GenerationMode>('AI');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('moyen');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['multiple_choice']);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [generationError, setGenerationError] = useState('');
  const { data: courses = [] } = useQuery({
    queryKey: ['teacher-courses', teacherId],
    queryFn: () => coursesApi.getByTeacher(teacherId),
  });
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialDraft?.title ?? initial?.title ?? '',
      courseId: initialDraft?.courseId ?? initial?.courseId ?? 0,
      courseName: initial?.courseName ?? '',
      duration: initial?.duration ?? 30,
      passingScore: initial?.passingScore ?? 70,
      creationMode: initialDraft?.creationMode ?? initial?.creationMode ?? 'MANUAL',
      gradingMode: initial?.gradingMode ?? 'AUTO',
      questions: initialDraft?.questions.map(question => ({
        text: question.text ?? '',
        type: question.type ?? 'multiple_choice',
        options: question.options ?? [],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation ?? '',
        points: question.points ?? 1,
        modelAnswer: question.modelAnswer ?? '',
        rubric: question.rubric ?? '',
        source: question.source ?? null,
      })) ?? initial?.questions.map(question => ({
        text: question.text,
        type: question.type ?? 'multiple_choice',
        options: question.options ?? [],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation ?? '',
        points: question.points ?? 1,
        modelAnswer: question.modelAnswer ?? '',
        rubric: question.rubric ?? '',
        source: question.source ?? null,
      })) ?? [{
        text: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        points: 1,
        modelAnswer: '',
        rubric: '',
        source: null,
      }],
    },
  });
  const { fields, append, remove, replace, update } = useFieldArray({ control: form.control, name: 'questions' });
  const selectedCourseId = form.watch('courseId');
  const { data: documents = [], isLoading: documentsLoading, error: documentsError } = useQuery({
    queryKey: ['course-documents', selectedCourseId],
    queryFn: () => documentsApi.list(selectedCourseId),
    enabled: generationMode === 'RAG' && selectedCourseId > 0,
  });
  const generate = useMutation({
    mutationFn: () => quizzesApi.generateDraft({
      topic: topic.trim() || undefined,
      course_id: selectedCourseId,
      num_questions: questionCount,
      difficulty,
      types: selectedTypes,
      language: 'fr',
      ...(generationMode === 'RAG' ? { document_ids: selectedDocuments } : {}),
    }),
    onSuccess: draft => {
      form.setValue('title', draft.title);
      form.setValue('creationMode', draft.creationMode);
      replace(draft.questions.map(question => ({
        text: question.text ?? '',
        type: question.type ?? 'multiple_choice',
        options: question.options ?? [],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation ?? '',
        points: question.points ?? 1,
        modelAnswer: question.modelAnswer ?? '',
        rubric: question.rubric ?? '',
        source: question.source ?? null,
      })));
      setGenerationError(draft.mock ? 'Mode démonstration : vérifiez et remplacez chaque question avant de publier.' : '');
    },
    onError: error => setGenerationError(apiErrorMessage(error, 'La génération du quiz a échoué.')),
  });

  const onSubmit = (data: Form) => {
    const course = courses.find(item => item.id === data.courseId);
    onSuccess({
      ...data,
      courseName: course?.title ?? data.courseName,
      questions: data.questions.map(question => {
        const { source, ...questionData } = question;
        return {
          ...questionData,
          modelAnswer: question.modelAnswer ?? '',
          rubric: question.rubric ?? '',
          explanation: question.explanation ?? '',
          ...(source ? { source } : {}),
        };
      }),
    });
  };
  const regenerateQuestion = async (index: number) => {
    const current = form.getValues(`questions.${index}`);
    const sourceId = current.source?.documentId;
    try {
      setGenerationError('');
      const draft = await quizzesApi.generateDraft({
        topic: current.text,
        course_id: selectedCourseId,
        num_questions: 1,
        difficulty,
        types: [current.type],
        language: 'fr',
        ...(sourceId ? { document_ids: [sourceId] } : {}),
      });
      const generated = draft.questions[0];
      update(index, {
        text: generated.text ?? '',
        type: generated.type ?? current.type,
        options: generated.options ?? [],
        correctAnswer: generated.correctAnswer,
        explanation: generated.explanation ?? '',
        points: generated.points ?? current.points,
        modelAnswer: generated.modelAnswer ?? '',
        rubric: generated.rubric ?? '',
        source: generated.source ?? current.source ?? null,
      });
      if (draft.mock) setGenerationError('Question simulée : vérifiez-la avant de publier.');
    } catch (error) {
      setGenerationError(apiErrorMessage(error, 'Impossible de régénérer cette question.'));
    }
  };
  const addType = (type: Form['questions'][number]['type']) => append({
    text: '',
    type,
    options: type === 'true_false' ? ['Vrai', 'Faux'] : type === 'short_answer' ? [] : ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 1,
    modelAnswer: '',
    rubric: '',
    source: null,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[78vh] space-y-5 overflow-y-auto p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Titre du quiz
          <input {...form.register('title')} className={`${controlClass} mt-1.5`} />
          {form.formState.errors.title && <span className="mt-1 block text-red-600">{form.formState.errors.title.message}</span>}
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Cours associé
          <select {...form.register('courseId', { valueAsNumber: true })} className={`${controlClass} mt-1.5`}>
            <option value={0}>Choisir un cours…</option>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Durée (min)
          <input {...form.register('duration', { valueAsNumber: true })} type="number" min="1" className={`${controlClass} mt-1.5`} />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Score minimal (%)
          <input {...form.register('passingScore', { valueAsNumber: true })} type="number" min="0" max="100" className={`${controlClass} mt-1.5`} />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Mode de correction
          <select {...form.register('gradingMode')} className={`${controlClass} mt-1.5`}>
            <option value="AUTO">Automatique (QCM / vrai-faux)</option>
            <option value="AI">IA pour les réponses courtes</option>
            <option value="MANUAL">Correction par l’enseignant</option>
          </select>
        </label>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-800 dark:text-white">Générer un brouillon</h3>
            <p className="mt-1 text-[10px] text-slate-500">Le brouillon n’est pas enregistré : relisez-le avant de créer le quiz.</p>
          </div>
          <select
            value={generationMode}
            onChange={event => {
              const mode = event.target.value as GenerationMode;
              setGenerationMode(mode);
              form.setValue('creationMode', mode);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="AI">Génération IA</option>
            <option value="RAG">À partir d’un PDF</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={topic} onChange={event => setTopic(event.target.value)} placeholder="Sujet ou chapitre" className={controlClass} />
          <select value={difficulty} onChange={event => setDifficulty(event.target.value)} className={controlClass}>
            <option value="facile">Facile</option><option value="moyen">Moyen</option><option value="difficile">Difficile</option>
          </select>
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Nombre de questions
            <input type="number" min="1" max="20" value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))} className={`${controlClass} mt-1`} />
          </label>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            {([
              ['multiple_choice', 'QCM'],
              ['true_false', 'Vrai/Faux'],
              ['short_answer', 'Réponse courte'],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5">
                <input type="checkbox" checked={selectedTypes.includes(value)} onChange={event => setSelectedTypes(current => event.target.checked ? [...current, value] : current.filter(item => item !== value))} />
                {label}
              </label>
            ))}
          </div>
        </div>
        {generationMode === 'RAG' && (
          <label className="block text-xs text-slate-600 dark:text-slate-300">
            PDF source
            <select
              value={selectedDocuments[0] ?? ''}
              onChange={event => setSelectedDocuments(event.target.value ? [Number(event.target.value)] : [])}
              className={`${controlClass} mt-1`}
              disabled={documentsLoading || selectedCourseId < 1}
            >
              <option value="">Choisir un document prêt…</option>
              {documents.filter(document => document.status === 'READY').map(document => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
            {documentsError && <span role="alert" className="mt-1 block text-red-600">{apiErrorMessage(documentsError)}</span>}
          </label>
        )}
        {generationError && <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">{generationError}</p>}
        <button
          type="button"
          disabled={generate.isPending || selectedCourseId < 1 || selectedTypes.length === 0 || (generationMode === 'RAG' && selectedDocuments.length === 0)}
          onClick={() => {
            setGenerationError('');
            generate.mutate();
          }}
          className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {generate.isPending ? 'Génération…' : 'Générer le brouillon'}
        </button>
      </section>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Questions ({fields.length})</label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => addType('multiple_choice')} className="flex items-center gap-1 text-xs font-medium text-indigo-600"><Plus className="h-3.5 w-3.5" />QCM</button>
            <button type="button" onClick={() => addType('true_false')} className="flex items-center gap-1 text-xs font-medium text-indigo-600"><Plus className="h-3.5 w-3.5" />Vrai/Faux</button>
            <button type="button" onClick={() => addType('short_answer')} className="flex items-center gap-1 text-xs font-medium text-indigo-600"><Plus className="h-3.5 w-3.5" />Réponse courte</button>
          </div>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => {
            const type = form.watch(`questions.${index}.type`);
            const options = form.watch(`questions.${index}.options`) ?? [];
            return (
              <article key={field.id} className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Question {index + 1}</span>
                  <div className="flex gap-2">
                    <select
                      value={type}
                      onChange={event => {
                        const next = event.target.value as Form['questions'][number]['type'];
                        form.setValue(`questions.${index}.type`, next);
                        form.setValue(`questions.${index}.options`, next === 'true_false' ? ['Vrai', 'Faux'] : next === 'short_answer' ? [] : ['', '']);
                        form.setValue(`questions.${index}.correctAnswer`, 0);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="multiple_choice">QCM</option><option value="true_false">Vrai/Faux</option><option value="short_answer">Réponse courte</option>
                    </select>
                    <button type="button" onClick={() => void regenerateQuestion(index)} disabled={selectedCourseId < 1} className="text-[10px] font-medium text-violet-700 disabled:opacity-40 dark:text-violet-300">Régénérer</button>
                    {fields.length > 1 && <button type="button" aria-label={`Supprimer la question ${index + 1}`} onClick={() => remove(index)} className="p-1 text-red-500"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
                <input {...form.register(`questions.${index}.text`)} placeholder="Texte de la question…" className={controlClass} />
                {type === 'short_answer' ? (
                  <>
                    <textarea {...form.register(`questions.${index}.modelAnswer`)} placeholder="Réponse modèle" className={controlClass} rows={2} />
                    <textarea {...form.register(`questions.${index}.rubric`)} placeholder="Barème de correction (facultatif)" className={controlClass} rows={2} />
                  </>
                ) : (
                  <div className="space-y-2">
                    {options.map((_, optionIndex) => (
                      <label key={optionIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={form.watch(`questions.${index}.correctAnswer`) === optionIndex}
                          onChange={() => form.setValue(`questions.${index}.correctAnswer`, optionIndex)}
                          aria-label={`Choix ${optionIndex + 1} correct`}
                        />
                        <input {...form.register(`questions.${index}.options.${optionIndex}`)} disabled={type === 'true_false'} className={`${controlClass} py-1.5 text-xs`} />
                      </label>
                    ))}
                    {type === 'multiple_choice' && options.length < 6 && (
                      <button type="button" onClick={() => form.setValue(`questions.${index}.options`, [...options, ''])} className="text-[10px] text-indigo-600">+ Ajouter un choix</button>
                    )}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[10px] text-slate-500">Points
                    <input {...form.register(`questions.${index}.points`, { valueAsNumber: true })} type="number" min="0.01" step="0.25" className={`${controlClass} mt-1 py-1.5 text-xs`} />
                  </label>
                  <input {...form.register(`questions.${index}.explanation`)} placeholder="Explication de la réponse" className={`${controlClass} text-xs`} />
                </div>
                {form.watch(`questions.${index}.source`) && (
                  <p className="text-[10px] text-violet-700 dark:text-violet-300">
                    Source : {form.watch(`questions.${index}.source.title`) ?? 'Document'} — page {form.watch(`questions.${index}.source.page`)}
                  </p>
                )}
                {form.formState.errors.questions?.[index] && (
                  <p role="alert" className="text-[10px] text-red-600">{form.formState.errors.questions[index]?.options?.message ?? form.formState.errors.questions[index]?.modelAnswer?.message}</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <button type="button" onClick={onCancel} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">Annuler</button>
        <button type="submit" disabled={form.formState.isSubmitting} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {initial ? 'Enregistrer les modifications' : 'Enregistrer le quiz'}
        </button>
      </div>
    </form>
  );
}
