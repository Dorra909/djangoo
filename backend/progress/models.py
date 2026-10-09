from django.conf import settings
from django.db import models

from courses.models import Course, Lesson


class LessonProgress(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lesson_progress",
        limit_choices_to={"role": "ETUDIANT"},
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="lesson_progress",
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="progress_records",
    )
    completed_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-last_accessed",)
        constraints = [
            models.UniqueConstraint(
                fields=("student", "lesson"),
                name="unique_student_lesson_progress",
            ),
        ]

    def __str__(self):
        return f"{self.student.email}: {self.lesson.title}"
