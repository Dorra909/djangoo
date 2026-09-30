import { useNavigate } from 'react-router';
import { Star, Users, BookOpen, Clock } from 'lucide-react';
import type { Course } from '../../types';
import { Badge } from './Badge';

interface CourseCardProps {
  course: Course;
  basePath?: string;
  actions?: React.ReactNode;
}

const levelVariant = { 'Débutant': 'emerald', 'Intermédiaire': 'amber', 'Avancé': 'red' } as const;

export function CourseCard({ course, basePath = '/student/courses', actions }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all duration-200 group">
      <div
        className="relative h-36 bg-slate-200 dark:bg-slate-700 cursor-pointer overflow-hidden"
        onClick={() => navigate(`${basePath}/${course.id}`)}
      >
        {course.thumbnail && (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-2 left-2">
          <Badge variant={levelVariant[course.level] || 'slate'}>{course.level}</Badge>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-1">{course.category}</p>
        <h3
          className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          onClick={() => navigate(`${basePath}/${course.id}`)}
        >
          {course.title}
        </h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">par {course.teacherName}</p>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-[10px] font-semibold">{course.rating}</span>
            <span className="text-[10px] text-slate-400">({course.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">{course.enrolledCount}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <BookOpen className="w-3 h-3" />
            <span className="text-[10px]">{course.lessons.length} leçons</span>
          </div>
        </div>

        {actions && <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">{actions}</div>}
      </div>
    </div>
  );
}
