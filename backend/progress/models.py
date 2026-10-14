from django.conf import settings
from django.db import models
from django.db.models import Sum

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


class Progression(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_progressions",
        limit_choices_to={"role": "ETUDIANT"},
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="student_progressions",
    )
    pourcentage = models.FloatField(default=0)
    date_mise_a_jour = models.DateTimeField(auto_now=True)
    chapitres_termines = models.PositiveIntegerField(default=0)
    temps_passe = models.FloatField(default=0)

    class Meta:
        ordering = ("-date_mise_a_jour",)
        constraints = [
            models.UniqueConstraint(
                fields=("student", "course"),
                name="unique_student_course_progression",
            ),
        ]

    def __str__(self):
        return f"{self.student.email}: {self.course.title} ({self.pourcentage}%)"

    @property
    def dateMiseAJour(self):
        return self.date_mise_a_jour

    @property
    def chapitresTermines(self):
        return self.chapitres_termines

    @property
    def tempsPasse(self):
        return self.temps_passe

    @classmethod
    def actualiser(cls, student, course):
        completed = LessonProgress.objects.filter(
            student=student,
            course=course,
        )
        completed_count = completed.count()
        total_count = course.lessons.count()
        percentage = round(completed_count * 100 / total_count) if total_count else 0
        time_spent = (
            completed.aggregate(total=Sum("lesson__duration"))["total"] or 0
        )
        progression, _ = cls.objects.update_or_create(
            student=student,
            course=course,
            defaults={
                "pourcentage": percentage,
                "chapitres_termines": completed_count,
                "temps_passe": time_spent,
            },
        )
        from courses.models import Enrollment

        Enrollment.objects.filter(student=student, course=course).update(
            progression=percentage
        )
        return progression

    @classmethod
    def consulter(cls, etudiant=None, cours=None):
        progressions = cls.objects.all()
        if etudiant is not None:
            progressions = progressions.filter(student=etudiant)
        if cours is not None:
            progressions = progressions.filter(course=cours)
        return progressions
