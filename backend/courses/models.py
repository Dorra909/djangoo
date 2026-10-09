from django.conf import settings
from django.db import models


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = "Débutant", "Débutant"
        INTERMEDIATE = "Intermédiaire", "Intermédiaire"
        ADVANCED = "Avancé", "Avancé"

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses",
        limit_choices_to={"role": "ENSEIGNANT"},
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=100)
    level = models.CharField(max_length=20, choices=Level.choices)
    thumbnail = models.URLField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    review_count = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class Lesson(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="lessons",
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    video_url = models.URLField(blank=True)
    pdf_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=1)
    duration = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ("order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("course", "order"),
                name="unique_lesson_order_per_course",
            ),
        ]

    def __str__(self):
        return f"{self.course.title}: {self.title}"


class Enrollment(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
        limit_choices_to={"role": "ETUDIANT"},
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-enrolled_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("student", "course"),
                name="unique_student_course_enrollment",
            ),
        ]

    def __str__(self):
        return f"{self.student.email} enrolled in {self.course.title}"
