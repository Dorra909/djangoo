import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { Course } from '../../types';
import type { CourseWrite } from '../../api/coursesApi';

const schema = z.object({
  title: z.string().min(3, 'Titre requis'),
  description: z.string().min(10, 'Description requise'),
  category: z.string().min(1, 'Catégorie requise'),
  level: z.enum(['Débutant', 'Intermédiaire', 'Avancé']),
  thumbnail: z.string().url('URL invalide').optional().or(z.literal('')),
  isPublished: z.boolean(),
  lessons: z.array(z.object({
    title: z.string().min(1, 'Titre leçon requis'),
    content: z.string().min(1, 'Contenu requis'),
    videoUrl: z.string().optional().or(z.literal('')),
  })).min(1, 'Au moins une leçon requise'),
});

type Form = z.infer<typeof schema>;

interface CourseFormProps {
  initial?: Course | null;
  onSuccess: (data: CourseWrite) => void;
  onCancel: () => void;
}

const categories = ['Développement Web', 'Data Science', 'Design', 'Backend', 'Mobile', 'DevOps', 'Marketing'];

export function CourseForm({ initial, onSuccess, onCancel }: CourseFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title || '',
      description: initial?.description || '',
      category: initial?.category || '',
      level: initial?.level || 'Débutant',
      thumbnail: initial?.thumbnail || '',
      isPublished: initial?.isPublished ?? false,
      lessons: initial?.lessons.map(l => ({ title: l.title, content: l.content, videoUrl: l.videoUrl || '' })) || [{ title: '', content: '', videoUrl: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lessons' });

  const onSubmit = (data: Form) => {
    onSuccess({
      ...data,
      lessons: data.lessons.map((l, i) => ({ title: l.title, content: l.content, videoUrl: l.videoUrl, order: i + 1 })),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Titre du cours</label>
          <input {...register('title')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
          {errors.title && <p className="text-red-500 text-[10px] mt-1">{errors.title.message}</p>}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
          <input {...register('isPublished')} type="checkbox" className="accent-indigo-600" />
          Publier le cours dans le catalogue étudiant
        </label>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Catégorie</label>
          <select {...register('category')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
            <option value="">Choisir...</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
        <textarea {...register('description')} rows={3} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" />
        {errors.description && <p className="text-red-500 text-[10px] mt-1">{errors.description.message}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Niveau</label>
          <select {...register('level')} className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">URL Thumbnail</label>
          <input {...register('thumbnail')} placeholder="https://..." className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Leçons</label>
          <button type="button" onClick={() => append({ title: '', content: '', videoUrl: '' })} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div key={field.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Leçon {i + 1}</span>
                </div>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input {...register(`lessons.${i}.title`)} placeholder="Titre de la leçon" className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
              <textarea {...register(`lessons.${i}.content`)} placeholder="Contenu de la leçon..." rows={2} className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none" />
              <input {...register(`lessons.${i}.videoUrl`)} placeholder="URL vidéo (optionnel)" className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
            </div>
          ))}
        </div>
        {errors.lessons && <p className="text-red-500 text-[10px] mt-1">{(errors.lessons as { message?: string }).message}</p>}
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
