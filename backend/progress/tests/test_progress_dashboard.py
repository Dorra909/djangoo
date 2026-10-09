import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from complaints.models import Complaint
from courses.models import Course, Enrollment, Lesson
from progress.models import LessonProgress
from quizzes.models import Quiz, QuizAttempt


User = get_user_model()


@pytest.fixture
def users(db):
    admin = User.objects.create_user(
        email="dashboard.admin@example.com",
        password="Strong-pass-123!",
        full_name="Dashboard Admin",
        role=User.Role.ADMIN,
    )
    teacher = User.objects.create_user(
        email="dashboard.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Dashboard Teacher",
        role=User.Role.TEACHER,
    )
    student = User.objects.create_user(
        email="dashboard.student@example.com",
        password="Strong-pass-123!",
        full_name="Dashboard Student",
        role=User.Role.STUDENT,
    )
    return admin, teacher, student


@pytest.fixture
def learner_course(users):
    _, teacher, student = users
    course = Course.objects.create(
        teacher=teacher,
        title="Progress course",
        description="A course to track progress.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    lessons = [
        Lesson.objects.create(
            course=course,
            title=f"Lesson {index}",
            content="Lesson content.",
            order=index,
        )
        for index in range(1, 4)
    ]
    Enrollment.objects.create(student=student, course=course)
    return course, lessons


@pytest.mark.django_db
def test_progress_is_derived_from_unique_completed_lessons(users, learner_course):
    _, _, student = users
    course, lessons = learner_course
    LessonProgress.objects.create(
        student=student,
        course=course,
        lesson=lessons[0],
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.get("/api/progress/mine/")

    assert response.status_code == 200
    assert response.data == [
        {
            "courseId": course.id,
            "courseTitle": "Progress course",
            "completedLessons": 1,
            "totalLessons": 3,
            "percentage": 33,
            "lastAccessed": response.data[0]["lastAccessed"],
        }
    ]
    assert response.data[0]["lastAccessed"]


@pytest.mark.django_db
def test_zero_progress_is_returned_for_each_enrollment(users, learner_course):
    _, _, student = users
    course, _ = learner_course
    client = APIClient()
    client.force_authenticate(student)

    response = client.get("/api/progress/mine/")

    assert response.status_code == 200
    assert response.data[0]["courseId"] == course.id
    assert response.data[0]["completedLessons"] == 0
    assert response.data[0]["percentage"] == 0
    assert response.data[0]["lastAccessed"]


@pytest.mark.django_db
def test_progress_and_dashboard_endpoints_reject_wrong_roles(users):
    admin, teacher, student = users

    student_client = APIClient()
    student_client.force_authenticate(student)
    teacher_progress = student_client.get("/api/progress/mine/")
    assert teacher_progress.status_code == 200
    assert student_client.get("/api/dashboard/teacher/").status_code == 403
    assert student_client.get("/api/dashboard/admin/").status_code == 403

    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    assert teacher_client.get("/api/dashboard/teacher/").status_code == 200
    assert teacher_client.get("/api/dashboard/student/").status_code == 403

    admin_client = APIClient()
    admin_client.force_authenticate(admin)
    assert admin_client.get("/api/dashboard/admin/").status_code == 200
    assert admin_client.get("/api/dashboard/student/").status_code == 403


@pytest.mark.django_db
def test_student_dashboard_contains_only_own_enrollment_and_attempts(
    users,
    learner_course,
):
    _, teacher, student = users
    course, _ = learner_course
    quiz = Quiz.objects.create(
        teacher=teacher,
        course=course,
        title="Enrolled quiz",
    )
    own_attempt = QuizAttempt.objects.create(quiz=quiz, student=student)
    other_student = User.objects.create_user(
        email="dashboard.other@example.com",
        password="Strong-pass-123!",
        full_name="Another Student",
        role=User.Role.STUDENT,
    )
    QuizAttempt.objects.create(quiz=quiz, student=other_student)
    client = APIClient()
    client.force_authenticate(student)

    response = client.get("/api/dashboard/student/")

    assert response.status_code == 200
    assert [course_data["id"] for course_data in response.data["courses"]] == [
        course.id
    ]
    assert [attempt["id"] for attempt in response.data["attempts"]] == []
    assert own_attempt.completed_at is None


@pytest.mark.django_db
def test_teacher_dashboard_contains_only_their_own_courses(users, learner_course):
    _, teacher, _ = users
    course, _ = learner_course
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.get("/api/dashboard/teacher/")

    assert response.status_code == 200
    assert [course_data["id"] for course_data in response.data["courses"]] == [
        course.id
    ]


@pytest.mark.django_db
def test_admin_dashboard_counts_roles_courses_quizzes_and_open_complaints(
    users,
    learner_course,
):
    admin, teacher, student = users
    course, _ = learner_course
    quiz = Quiz.objects.create(
        teacher=teacher,
        course=course,
        title="Dashboard quiz",
    )
    Complaint.objects.create(
        author=student,
        subject="Open issue",
        category="Technical",
        message="Issue needs attention.",
    )
    Complaint.objects.create(
        author=teacher,
        subject="Resolved issue",
        category="Teaching",
        message="Issue has been resolved.",
        status=Complaint.Status.RESOLVED,
    )
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get("/api/dashboard/admin/")

    assert response.status_code == 200
    stats = response.data["stats"]
    assert stats["totalUsers"] == 3
    assert stats["totalTeachers"] == 1
    assert stats["totalStudents"] == 1
    assert stats["totalCourses"] == 1
    assert stats["totalQuizzes"] == 1
    assert stats["openComplaints"] == 1
    assert len(stats["newUsersPerMonth"]) == 6
    assert len(response.data["recentComplaints"]) == 2
    assert response.data["recentComplaints"][0]["status"] in (
        "Open",
        "Resolved",
    )
