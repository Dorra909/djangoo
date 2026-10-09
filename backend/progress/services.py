from django.db import models
from django.db.models import Count, Max

from courses.models import Enrollment
from progress.models import LessonProgress


def get_student_progress(student):
    enrollments = (
        Enrollment.objects.filter(student=student)
        .select_related("course")
        .annotate(
            total_lessons=Count("course__lessons", distinct=True),
            completed_lessons=Count(
                "course__lessons__progress_records",
                filter=models.Q(
                    course__lessons__progress_records__student=student
                ),
                distinct=True,
            ),
            last_activity=Max(
                "course__lessons__progress_records__last_accessed",
                filter=models.Q(
                    course__lessons__progress_records__student=student
                ),
            ),
        )
        .order_by("-enrolled_at")
    )
    progress = []
    for enrollment in enrollments:
        total = enrollment.total_lessons
        completed = enrollment.completed_lessons
        progress.append(
            {
                "courseId": enrollment.course_id,
                "courseTitle": enrollment.course.title,
                "completedLessons": completed,
                "totalLessons": total,
                "percentage": round(completed * 100 / total) if total else 0,
                "lastAccessed": enrollment.last_activity or enrollment.enrolled_at,
            }
        )
    return progress


def get_course_progress(student, course):
    total = course.lessons.count()
    completed = LessonProgress.objects.filter(
        student=student,
        course=course,
    ).count()
    latest = (
        LessonProgress.objects.filter(student=student, course=course)
        .order_by("-last_accessed")
        .values_list("last_accessed", flat=True)
        .first()
    )
    return {
        "courseId": course.id,
        "courseTitle": course.title,
        "completedLessons": completed,
        "totalLessons": total,
        "percentage": round(completed * 100 / total) if total else 0,
        "lastAccessed": latest,
    }
