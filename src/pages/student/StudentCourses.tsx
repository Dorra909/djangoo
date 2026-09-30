import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Search, ChevronRight, BookOpen, CheckCircle, PlayCircle, FileText } from 'lucide-react';
import { coursesApi } from '../../api/coursesApi';
import { progressApi } from '../../api/progressApi';
import { CourseCard } from '../../components/ui/CourseCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const levels = ['Tous', 'Débutant', 'Intermédiaire', 'Avancé'] as const;
const categories = ['Toutes', 'Développement Web', 'Data Science', 'Design', 'Backend', 'Mobile'];

export function StudentCourses() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('Tous');
  const [category, setCategory] = useState('Toutes');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const { data: courses = [], isLoading } = useQuery({ queryKey: ['courses'], queryFn: coursesApi.getAll });
  const { data: progress = [] } = useQuery({ queryKey: ['my-progress', user?.id], queryFn: () => progressApi.getByStudent(user!.id) });

  const myCourseIds = progress.map(p => p.courseId);

  const filtered = courses.filter(c => {
    if (tab === 'mine' && !myCourseIds.includes(c.id)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (level !== 'Tous' && c.level !== level) return false;
    if (category !== 'Toutes' && c.category !== category) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Catalogue de cours</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{courses.length} cours disponibles</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cours..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400" />
        </div>
        <select value={level} onChange={e => setLevel(e.target.value)} className="px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
          {levels.map(l => <option key={l}>{l}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {([['all', 'Tous les cours'], ['mine', 'Mes cours']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === val ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length:6}).map((_,i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">Aucun cours trouvé</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => {
            const p = progress.find(pr => pr.courseId === c.id);
            return (
              <CourseCard
                key={c.id}
                course={c}
                basePath="/student/courses"
                actions={
                  p ? (
                    <div>
                      <ProgressBar value={p.percentage} size="sm" showPercent />
                      <p className="text-[10px] text-slate-500 mt-1">{p.completedLessons}/{p.totalLessons} leçons</p>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({ queryKey: ['course', id], queryFn: () => coursesApi.getById(Number(id)) });
  const { data: progress = [] } = useQuery({ queryKey: ['my-progress', user?.id], queryFn: () => progressApi.getByStudent(user!.id) });

  const myProgress = progress.find(p => p.courseId === Number(id));
  const markMut = useMutation({
    mutationFn: ({ lessonId }: { lessonId: number }) => progressApi.markLessonComplete(Number(id), lessonId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-progress'] }); toast('success', 'Leçon marquée comme complétée !'); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!course) return <div className="text-center py-12 text-slate-400">Cours non trouvé</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
        ← Retour
      </button>

      <div className="relative rounded-2xl overflow-hidden h-56 bg-slate-200 dark:bg-slate-700">
        {course.thumbnail && <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-5 text-white">
          <Badge variant="indigo">{course.category}</Badge>
          <h1 className="text-2xl font-bold mt-2">{course.title}</h1>
          <p className="text-sm text-white/80 mt-1">par {course.teacherName}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Description</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{course.description}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Programme du cours</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {course.lessons.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                    {lesson.duration && <p className="text-[10px] text-slate-500 mt-0.5">{lesson.duration} min</p>}
                  </div>
                  {lesson.videoUrl && <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />}
                  {myProgress && myProgress.completedLessons > i && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                  <button
                    onClick={() => markMut.mutate({ lessonId: lesson.id })}
                    disabled={markMut.isPending}
                    className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Suivre
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Ma progression</h3>
            {myProgress ? (
              <>
                <ProgressBar value={myProgress.percentage} />
                <p className="text-xs text-slate-500 mt-2">{myProgress.completedLessons} / {myProgress.totalLessons} leçons complétées</p>
              </>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-slate-400 mb-3">Pas encore commencé</p>
                <button onClick={() => markMut.mutate({ lessonId: course.lessons[0]?.id })} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
                  Commencer
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-2.5">
            {[
              ['Niveau', course.level],
              ['Leçons', `${course.lessons.length} leçons`],
              ['Étudiants', course.enrolledCount],
              ['Note', `${course.rating}/5 (${course.reviewCount} avis)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-900 dark:text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
