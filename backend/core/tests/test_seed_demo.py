import pytest
from django.core.management import call_command

from accounts.models import User
from chatbot.models import ChatSession
from complaints.models import Complaint
from core.models import Notification
from courses.models import Course, Enrollment, Lesson
from progress.models import LessonProgress
from quizzes.models import Quiz, QuizAttempt


@pytest.mark.django_db
def test_seed_demo_creates_repeatable_learning_data(capsys):
    call_command("seed_demo")
    call_command("seed_demo")

    admin = User.objects.get(email="admin@demo.com")
    teacher = User.objects.get(email="teacher@demo.com")
    student = User.objects.get(email="student@demo.com")
    courses = Course.objects.filter(teacher=teacher)

    assert admin.role == User.Role.ADMIN
    assert admin.check_password("demo1234")
    assert teacher.role == User.Role.TEACHER
    assert student.role == User.Role.STUDENT
    assert courses.count() == 5
    assert Lesson.objects.filter(course__in=courses).count() == 25
    assert Quiz.objects.filter(teacher=teacher).count() == 4
    assert Enrollment.objects.filter(student=student).count() == 5
    assert QuizAttempt.objects.filter(student=student).count() == 4
    assert LessonProgress.objects.filter(student=student).count() == 2
    assert Complaint.objects.filter(author__in=(teacher, student)).count() == 2
    assert Notification.objects.filter(user__in=(teacher, student)).exists()
    assert ChatSession.objects.filter(user=student).count() == 1
    assert "Demo data ready" in capsys.readouterr().out
