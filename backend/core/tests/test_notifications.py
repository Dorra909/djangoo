import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.utils import timezone

from core.models import Notification
from courses.models import Course, Enrollment
from quizzes.models import Choice, Question, Quiz, QuizAttempt


User = get_user_model()


@pytest.mark.django_db
def test_notifications_are_owner_scoped_and_can_be_marked_read():
    first = User.objects.create_user(
        email="notification.first@example.com",
        password="Strong-pass-123!",
        full_name="First User",
        role=User.Role.STUDENT,
    )
    second = User.objects.create_user(
        email="notification.second@example.com",
        password="Strong-pass-123!",
        full_name="Second User",
        role=User.Role.STUDENT,
    )
    first_notification = Notification.objects.create(
        user=first,
        title="Course update",
        message="A course update is ready.",
    )
    client = APIClient()
    client.force_authenticate(first)

    listing = client.get("/api/notifications/")
    marked = client.patch(
        f"/api/notifications/{first_notification.id}/read/",
        {},
        format="json",
    )
    client.force_authenticate(second)
    forbidden = client.patch(
        f"/api/notifications/{first_notification.id}/read/",
        {},
        format="json",
    )

    assert listing.status_code == 200
    assert any(row["id"] == first_notification.id for row in listing.data["results"])
    assert marked.status_code == 200
    assert marked.data["read"] is True
    assert forbidden.status_code == 404


@pytest.mark.django_db
def test_enrollment_and_quiz_completion_create_event_notifications_once():
    teacher = User.objects.create_user(
        email="notification.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Teacher",
        role=User.Role.TEACHER,
    )
    student = User.objects.create_user(
        email="notification.learner@example.com",
        password="Strong-pass-123!",
        full_name="Learner",
        role=User.Role.STUDENT,
    )
    course = Course.objects.create(
        teacher=teacher,
        title="Notification course",
        description="A course for notifications.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Enrollment.objects.create(student=student, course=course)
    quiz = Quiz.objects.create(teacher=teacher, course=course, title="Notification quiz")
    question = Question.objects.create(
        quiz=quiz,
        text="A question",
        type=Question.Type.TRUE_FALSE,
        order=1,
    )
    Choice.objects.create(question=question, text="Vrai", is_correct=True, order=1)
    Choice.objects.create(question=question, text="Faux", is_correct=False, order=2)
    attempt = QuizAttempt.objects.create(quiz=quiz, student=student)
    attempt.score = 100
    attempt.passed = True
    attempt.completed_at = timezone.now()
    attempt.save()
    attempt.save()

    assert Notification.objects.filter(
        user=student,
        title="Inscription confirmée",
    ).count() == 1
    assert Notification.objects.filter(
        user=student,
        title="Résultat du quiz",
    ).count() == 1
