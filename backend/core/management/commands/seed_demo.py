from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from chatbot.models import ChatSession
from complaints.models import Complaint
from core.models import Notification
from courses.models import Course, Enrollment, Lesson
from progress.models import LessonProgress
from quizzes.models import AttemptAnswer, Choice, Question, Quiz, QuizAttempt


COURSE_DATA = (
    ("Développement React", "Développement Web", "Débutant"),
    ("Python pour la Data Science", "Data Science", "Intermédiaire"),
    ("Design d'interfaces", "Design", "Débutant"),
    ("API avec Django REST", "Backend", "Avancé"),
    ("Applications mobiles", "Mobile", "Intermédiaire"),
)

LESSON_TOPICS = (
    ("Introduction et objectifs", "Découvrez les objectifs et les outils du module."),
    ("Fondamentaux", "Étudiez les concepts essentiels avec des exemples guidés."),
    ("Mise en pratique", "Appliquez les notions dans un exercice progressif."),
    ("Approfondissement", "Explorez les bonnes pratiques et les cas avancés."),
    ("Projet de synthèse", "Réalisez un projet pour consolider vos acquis."),
)

QUIZ_DATA = (
    ("Bases de React", 0),
    ("Python et données", 1),
    ("Principes UI/UX", 2),
    ("API REST sécurisée", 3),
)

QUESTION_DATA = (
    (
        "Quel est le rôle principal de ce concept ?",
        "multiple_choice",
        ("Structurer une application", "Remplacer la base de données", "Compiler le système d'exploitation"),
        0,
        "Choisissez la réponse qui décrit le rôle central du module.",
    ),
    (
        "La pratique régulière aide à maîtriser les notions.",
        "true_false",
        ("Vrai", "Faux"),
        0,
        "La mise en pratique renforce la compréhension.",
    ),
    (
        "Quelle approche est recommandée pour progresser ?",
        "multiple_choice",
        ("Construire un petit projet", "Ignorer les erreurs", "Éviter les exercices"),
        0,
        "Un projet progressif permet de vérifier ses acquis.",
    ),
)


class Command(BaseCommand):
    help = "Create repeatable demo accounts and learning activity."

    @transaction.atomic
    def handle(self, *args, **options):
        admin = self._user("admin@demo.com", "Administrateur démo", User.Role.ADMIN)
        teacher = self._user("teacher@demo.com", "Enseignant démo", User.Role.TEACHER)
        student = self._user("student@demo.com", "Étudiant démo", User.Role.STUDENT)

        courses = []
        for index, (title, category, level) in enumerate(COURSE_DATA):
            course, _ = Course.objects.update_or_create(
                teacher=teacher,
                title=title,
                defaults={
                    "description": f"Un parcours guidé pour apprendre {title.lower()} grâce à des leçons pratiques.",
                    "category": category,
                    "level": level,
                    "is_published": True,
                    "rating": "4.5",
                    "review_count": 12 + index,
                },
            )
            courses.append(course)
            seeded_lessons = []
            for order, (lesson_title, content) in enumerate(LESSON_TOPICS, start=1):
                lesson, _ = Lesson.objects.update_or_create(
                    course=course,
                    order=order,
                    defaults={
                        "title": f"{order}. {lesson_title}",
                        "content": content,
                        "duration": 12 + order * 3,
                    },
                )
                seeded_lessons.append(lesson)
            Enrollment.objects.get_or_create(student=student, course=course)
            if index == 0:
                for lesson in seeded_lessons[:2]:
                    LessonProgress.objects.get_or_create(
                        student=student,
                        course=course,
                        lesson=lesson,
                    )

        quizzes = []
        for title, course_index in QUIZ_DATA:
            course = courses[course_index]
            quiz, _ = Quiz.objects.update_or_create(
                teacher=teacher,
                course=course,
                title=title,
                defaults={"duration": 20, "passing_score": 70},
            )
            quizzes.append(quiz)
            retained_questions = []
            for order, (text, question_type, options, correct_index, explanation) in enumerate(
                QUESTION_DATA,
                start=1,
            ):
                question, _ = Question.objects.update_or_create(
                    quiz=quiz,
                    order=order,
                    defaults={
                        "text": f"{title} — {text}",
                        "type": question_type,
                        "explanation": explanation,
                    },
                )
                retained_questions.append(question.id)
                for choice_order, choice_text in enumerate(options, start=1):
                    Choice.objects.update_or_create(
                        question=question,
                        order=choice_order,
                        defaults={
                            "text": choice_text,
                            "is_correct": choice_order - 1 == correct_index,
                        },
                    )
                question.choices.exclude(order__lte=len(options)).delete()
            quiz.questions.exclude(id__in=retained_questions).delete()

        for quiz_index, quiz in enumerate(quizzes):
            attempt_date = timezone.localdate() - timedelta(days=quiz_index + 1)
            started_at = timezone.make_aware(
                datetime.combine(attempt_date, time(hour=12)),
            )
            attempt, created = QuizAttempt.objects.get_or_create(
                quiz=quiz,
                student=student,
                started_at=started_at,
                defaults={
                    "score": 100 if quiz_index % 2 == 0 else 67,
                    "passed": quiz_index % 2 == 0,
                    "completed_at": started_at + timedelta(minutes=8 + quiz_index),
                    "time_taken": 8 + quiz_index,
                },
            )
            if created:
                attempt.started_at = started_at
                attempt.save(update_fields=["started_at"])
            else:
                attempt.score = 100 if quiz_index % 2 == 0 else 67
                attempt.passed = quiz_index % 2 == 0
                attempt.completed_at = started_at + timedelta(minutes=8 + quiz_index)
                attempt.time_taken = 8 + quiz_index
                attempt.save(
                    update_fields=["score", "passed", "completed_at", "time_taken"]
                )
            attempt.attempt_answers.all().delete()
            for question_index, question in enumerate(
                quiz.questions.prefetch_related("choices").all()
            ):
                selected_choice = question.choices.get(is_correct=True)
                is_correct = True
                if quiz_index % 2 and question_index == 0:
                    selected_choice = question.choices.filter(is_correct=False).first()
                    if selected_choice is None:
                        raise ValueError(f"Question {question.pk} has no incorrect choice.")
                    is_correct = False
                AttemptAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_choice=selected_choice,
                    is_correct=is_correct,
                )

        self._complaint(student, "Accès à une leçon", Complaint.Status.OPEN)
        self._complaint(teacher, "Suggestion pédagogique", Complaint.Status.IN_PROGRESS)
        for user in (admin, teacher, student):
            Notification.objects.get_or_create(
                user=user,
                title="Bienvenue sur EduLearn",
                defaults={
                    "message": "Votre espace de démonstration est prêt.",
                    "read": False,
                },
            )
        ChatSession.objects.get_or_create(
            user=student,
            title="Première conversation",
        )
        self.stdout.write(self.style.SUCCESS(
            "Demo data ready. All demo accounts use password: demo1234."
        ))

    @staticmethod
    def _user(email, full_name, role):
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name, "role": role},
        )
        user.full_name = full_name
        user.role = role
        user.is_active = True
        if role == User.Role.ADMIN:
            user.is_staff = True
            user.is_superuser = True
        user.set_password("demo1234")
        user.save()
        return user

    @staticmethod
    def _complaint(author, subject, status):
        Complaint.objects.get_or_create(
            author=author,
            subject=subject,
            defaults={
                "category": "Technique",
                "message": "Cette demande de démonstration illustre le suivi des réclamations.",
                "status": status,
            },
        )
