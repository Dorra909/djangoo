from django.conf import settings
from django.db import models

from courses.models import Course


class Quiz(models.Model):
    class CreationMode(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AI = "AI", "AI"
        RAG = "RAG", "RAG"

    class GradingMode(models.TextChoices):
        AUTO = "AUTO", "Automatic"
        AI = "AI", "AI"
        MANUAL = "MANUAL", "Manual"

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quizzes",
        limit_choices_to={"role": "ENSEIGNANT"},
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="quizzes",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration = models.PositiveIntegerField(default=30)
    passing_score = models.PositiveSmallIntegerField(default=70)
    due_at = models.DateField(blank=True, null=True)
    max_score = models.FloatField(default=100)
    status = models.CharField(max_length=20, default="active")
    creation_mode = models.CharField(
        max_length=10,
        choices=CreationMode.choices,
        default=CreationMode.MANUAL,
    )
    grading_mode = models.CharField(
        max_length=10,
        choices=GradingMode.choices,
        default=GradingMode.AUTO,
    )
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
    def dateCreation(self):
        return self.created_at

    @property
    def dateLimite(self):
        return self.due_at

    @dateLimite.setter
    def dateLimite(self, value):
        self.due_at = value

    @property
    def duree(self):
        return self.duration

    @duree.setter
    def duree(self, value):
        self.duration = value

    @property
    def nombreQuestions(self):
        return self.questions.count() if self.pk else 0

    @property
    def noteMax(self):
        return self.max_score

    @noteMax.setter
    def noteMax(self, value):
        self.max_score = value

    @property
    def statut(self):
        return self.status

    @statut.setter
    def statut(self, value):
        self.status = value

    @classmethod
    def creer(cls, enseignant, **attributs):
        field_map = {
            "cours": "course",
            "titre": "title",
            "dateLimite": "due_at",
            "duree": "duration",
            "noteMax": "max_score",
            "statut": "status",
        }
        values = {field_map.get(name, name): value for name, value in attributs.items()}
        return cls.objects.create(teacher=enseignant, **values)

    def modifier(self, **attributs):
        field_map = {
            "titre": "title",
            "dateLimite": "due_at",
            "duree": "duration",
            "noteMax": "max_score",
            "statut": "status",
        }
        for name, value in attributs.items():
            setattr(self, field_map.get(name, name), value)
        self.save()
        return self

    def supprimer(self):
        self.delete()

    @classmethod
    def consulter(cls):
        return cls.objects.all()


class Question(models.Model):
    class Type(models.TextChoices):
        MULTIPLE_CHOICE = "multiple_choice", "Multiple choice"
        TRUE_FALSE = "true_false", "True/false"
        SHORT_ANSWER = "short_answer", "Short answer"

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    text = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices)
    explanation = models.TextField(blank=True)
    points = models.FloatField(default=1.0)
    model_answer = models.TextField(blank=True)
    rubric = models.TextField(blank=True)
    source_document = models.ForeignKey(
        "rag.CourseDocument",
        on_delete=models.SET_NULL,
        related_name="quiz_questions",
        blank=True,
        null=True,
    )
    source_page = models.PositiveIntegerField(blank=True, null=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("quiz", "order"),
                name="unique_question_order_per_quiz",
            ),
        ]

    def __str__(self):
        return f"{self.quiz.title}: {self.text[:60]}"

    @property
    def enonce(self):
        return self.text

    @enonce.setter
    def enonce(self, value):
        self.text = value

    @property
    def ordre(self):
        return self.order

    @ordre.setter
    def ordre(self, value):
        self.order = value


class Choice(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="choices",
    )
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("question", "order"),
                name="unique_choice_order_per_question",
            ),
        ]

    def __str__(self):
        return self.text

    @property
    def contenu(self):
        return self.text

    @contenu.setter
    def contenu(self, value):
        self.text = value

    @property
    def estCorrecte(self):
        return self.is_correct

    @estCorrecte.setter
    def estCorrecte(self, value):
        self.is_correct = value

    @property
    def ordre(self):
        return self.order

    @ordre.setter
    def ordre(self, value):
        self.order = value


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        limit_choices_to={"role": "ETUDIANT"},
    )
    score = models.PositiveSmallIntegerField(default=0)
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    time_taken = models.PositiveIntegerField(default=0)
    needs_review = models.BooleanField(default=False)

    class Meta:
        ordering = ("-started_at",)

    def __str__(self):
        return f"{self.student.email}: {self.quiz.title}"

    @property
    def dateObtention(self):
        return self.completed_at

    @property
    def dureePasse(self):
        return self.time_taken

    @dureePasse.setter
    def dureePasse(self, value):
        self.time_taken = value

    @property
    def statut(self):
        if self.completed_at is None:
            return "En cours"
        return "Réussi" if self.passed else "Échoué"

    @classmethod
    def consulter(cls, quiz=None, etudiant=None):
        resultats = cls.objects.all()
        if quiz is not None:
            resultats = resultats.filter(quiz=quiz)
        if etudiant is not None:
            resultats = resultats.filter(student=etudiant)
        return resultats


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name="attempt_answers",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="attempt_answers",
    )
    selected_choice = models.ForeignKey(
        Choice,
        on_delete=models.SET_NULL,
        related_name="selected_answers",
        blank=True,
        null=True,
    )
    is_correct = models.BooleanField(default=False)
    text_answer = models.TextField(blank=True)
    ai_score = models.FloatField(blank=True, null=True)
    ai_feedback = models.TextField(blank=True)
    teacher_override_score = models.FloatField(blank=True, null=True)
    needs_review = models.BooleanField(default=False)
    explanation = models.TextField(blank=True)

    class Meta:
        ordering = ("question__order", "question_id")
        constraints = [
            models.UniqueConstraint(
                fields=("attempt", "question"),
                name="unique_question_answer_per_attempt",
            ),
        ]


Reponse = Choice
Resultat = QuizAttempt
