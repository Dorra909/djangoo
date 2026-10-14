import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { coursesApi } from '../../api/coursesApi';
import { Badge } from '../../components/ui/Badge';
import { CourseDocuments } from '../../components/ui/CourseDocuments';

export function TeacherCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading, error } = useQuery({
    queryKey: ['teacher-course', id],
    queryFn: () => coursesApi.getById(Number(id)),
  });

  if (isLoading) return <div className="py-12 text-center text-sm text-slate-400">Chargement du cours...</div>;
  if (error || !course) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger ce cours.</div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate('/teacher/courses')} className="text-xs text-slate-500 hover:text-slate-700">← Retour à mes cours</button>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{course.title}</h1>
            <p className="mt-1 text-xs text-slate-500">{course.category} · {course.level}</p>
          </div>
          <Badge variant={course.isPublished ? 'emerald' : 'slate'}>{course.isPublished ? 'Publié' : 'Brouillon'}</Badge>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{course.description}</p>
        <p className="mt-3 text-xs text-slate-500">{course.enrolledCount} étudiant(s) inscrit(s) · {course.lessons.length} leçon(s)</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {course.lessons.map((lesson, index) => (
          <article key={lesson.id} className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{index + 1}. {lesson.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-400">{lesson.content}</p>
            {lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">Ouvrir la vidéo</a>}
          </article>
        ))}
      </div>
      <CourseDocuments courseId={course.id} />
    </div>
  );
}
