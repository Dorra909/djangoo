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
    content = models.TextField(blank=True)
    category = models.CharField(max_length=100)
    level = models.CharField(max_length=20, choices=Level.choices)
    duration = models.FloatField(default=0)
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

    @property
    def titre(self):
        return self.title

    @titre.setter
    def titre(self, value):
        self.title = value

    @property
    def contenu(self):
        return self.content

    @contenu.setter
    def contenu(self, value):
        self.content = value

    @property
    def dateCreation(self):
        return self.created_at

    @property
    def dateModification(self):
        return self.updated_at

    @property
    def categorie(self):
        return self.category

    @categorie.setter
    def categorie(self, value):
        self.category = value

    @property
    def niveau(self):
        return self.level

    @niveau.setter
    def niveau(self, value):
        self.level = value

    @property
    def duree(self):
        return self.duration

    @duree.setter
    def duree(self, value):
        self.duration = value

    @property
    def statut(self):
        return "Publié" if self.is_published else "Brouillon"

    @statut.setter
    def statut(self, value):
        self.is_published = value is True or value in ("Publié", "published", "active")

    @classmethod
    def creer(cls, enseignant, **attributs):
        field_map = {
            "titre": "title",
            "contenu": "content",
            "categorie": "category",
            "niveau": "level",
            "duree": "duration",
            "statut": "is_published",
        }
        values = {field_map.get(name, name): value for name, value in attributs.items()}
        if "is_published" in values and isinstance(values["is_published"], str):
            values["is_published"] = values["is_published"] in (
                "Publié",
                "published",
                "active",
            )
        return cls.objects.create(teacher=enseignant, **values)

    def modifier(self, **attributs):
        field_map = {
            "titre": "title",
            "contenu": "content",
            "categorie": "category",
            "niveau": "level",
            "duree": "duration",
            "statut": "is_published",
        }
        for name, value in attributs.items():
            field = field_map.get(name, name)
            if field == "is_published" and isinstance(value, str):
                value = value in ("Publié", "published", "active")
            setattr(self, field, value)
        self.save()
        return self

    def supprimer(self):
        self.delete()

    @classmethod
    def consulter(cls):
        return cls.objects.all()


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
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

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
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    final_grade = models.FloatField(blank=True, null=True)
    progression = models.FloatField(default=0)

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

    @property
    def dateInscription(self):
        return self.enrolled_at

    @property
    def noteFinale(self):
        return self.final_grade

    @noteFinale.setter
    def noteFinale(self, value):
        self.final_grade = value

    @property
    def statut(self):
        return self.status

    @statut.setter
    def statut(self, value):
        self.status = value

    def valider(self):
        self.status = self.Status.ACTIVE
        self.save(update_fields=("status",))
        return self

    def annuler(self):
        self.delete()

    @classmethod
    def consulter(cls, etudiant=None, cours=None):
        inscriptions = cls.objects.all()
        if etudiant is not None:
            inscriptions = inscriptions.filter(student=etudiant)
        if cours is not None:
            inscriptions = inscriptions.filter(course=cours)
        return inscriptions


Cours = Course
Inscription = Enrollment
