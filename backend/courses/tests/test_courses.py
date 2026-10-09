import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from courses.models import Course, Enrollment, Lesson
from progress.models import LessonProgress


User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="courses.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Course Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def other_teacher(db):
    return User.objects.create_user(
        email="other.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Other Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="courses.student@example.com",
        password="Strong-pass-123!",
        full_name="Course Student",
        role=User.Role.STUDENT,
    )


def course_payload(title="Test course", published=True):
    return {
        "title": title,
        "description": "A useful course for learning.",
        "category": "Development",
        "level": "Débutant",
        "thumbnail": "",
        "isPublished": published,
        "lessons": [
            {"title": "Lesson one", "content": "First lesson", "order": 1},
            {"title": "Lesson two", "content": "Second lesson", "order": 2},
        ],
    }


@pytest.mark.django_db
def test_teacher_can_create_course_with_ordered_nested_lessons(teacher):
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post("/api/courses/", course_payload(), format="json")

    assert response.status_code == 201
    assert response.data["teacherId"] == teacher.id
    assert [lesson["order"] for lesson in response.data["lessons"]] == [1, 2]
    assert [lesson["title"] for lesson in response.data["lessons"]] == [
        "Lesson one",
        "Lesson two",
    ]
    assert Course.objects.get().teacher == teacher


@pytest.mark.django_db
def test_teacher_lists_only_own_courses_and_can_delete_own_course(
    teacher,
    other_teacher,
):
    own_course = Course.objects.create(
        teacher=teacher,
        title="Own course",
        description="A useful course.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    Course.objects.create(
        teacher=other_teacher,
        title="Other course",
        description="Another useful course.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    listing = client.get("/api/courses/")
    deletion = client.delete(f"/api/courses/{own_course.id}/")

    assert listing.status_code == 200
    assert [item["title"] for item in listing.data["results"]] == ["Own course"]
    assert deletion.status_code == 204
    assert not Course.objects.filter(pk=own_course.id).exists()


@pytest.mark.django_db
def test_teacher_can_update_nested_lessons_transactionally(teacher):
    client = APIClient()
    client.force_authenticate(teacher)
    course = Course.objects.create(
        teacher=teacher,
        title="Original",
        description="Original description",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=False,
    )
    Lesson.objects.create(course=course, title="Old", content="Old content", order=1)

    payload = course_payload("Updated", published=True)
    response = client.patch(f"/api/courses/{course.id}/", payload, format="json")

    assert response.status_code == 200
    course.refresh_from_db()
    assert course.title == "Updated"
    assert course.is_published is True
    assert list(course.lessons.values_list("title", flat=True)) == [
        "Lesson one",
        "Lesson two",
    ]


@pytest.mark.django_db
def test_teacher_cannot_edit_another_teachers_course(teacher, other_teacher):
    course = Course.objects.create(
        teacher=other_teacher,
        title="Private course",
        description="Owned by another teacher.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.patch(
        f"/api/courses/{course.id}/",
        {"title": "Changed"},
        format="json",
    )

    assert response.status_code == 404
    course.refresh_from_db()
    assert course.title == "Private course"


@pytest.mark.django_db
def test_teacher_can_reorder_owned_lessons(teacher):
    course = Course.objects.create(
        teacher=teacher,
        title="Course",
        description="A course description.",
        category="Development",
        level=Course.Level.BEGINNER,
    )
    first = Lesson.objects.create(
        course=course,
        title="First",
        content="First content",
        order=1,
    )
    second = Lesson.objects.create(
        course=course,
        title="Second",
        content="Second content",
        order=2,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.patch(
        f"/api/courses/{course.id}/lessons/reorder/",
        {"lessonIds": [second.id, first.id]},
        format="json",
    )

    assert response.status_code == 200
    assert [lesson["id"] for lesson in response.data["lessons"]] == [
        second.id,
        first.id,
    ]


@pytest.mark.django_db
def test_student_sees_only_published_courses(teacher, student):
    published = Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Visible to learners.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    Course.objects.create(
        teacher=teacher,
        title="Draft",
        description="Not visible.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=False,
    )
    client = APIClient()
    client.force_authenticate(student)

    response = client.get("/api/courses/")

    assert response.status_code == 200
    assert [item["id"] for item in response.data["results"]] == [published.id]


@pytest.mark.django_db
def test_student_must_enroll_before_completing_lesson(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Visible to learners.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    lesson = Lesson.objects.create(
        course=course,
        title="Lesson",
        content="Lesson content.",
        order=1,
    )
    client = APIClient()
    client.force_authenticate(student)

    forbidden = client.post(
        f"/api/courses/{course.id}/lessons/{lesson.id}/complete/",
        {},
        format="json",
    )
    assert forbidden.status_code == 403

    Enrollment.objects.create(student=student, course=course)
    completed = client.post(
        f"/api/courses/{course.id}/lessons/{lesson.id}/complete/",
        {},
        format="json",
    )
    repeated = client.post(
        f"/api/courses/{course.id}/lessons/{lesson.id}/complete/",
        {},
        format="json",
    )

    assert completed.status_code == 200
    assert completed.data["completedLessons"] == 1
    assert completed.data["totalLessons"] == 1
    assert completed.data["percentage"] == 100
    assert repeated.status_code == 200
    assert LessonProgress.objects.filter(student=student, lesson=lesson).count() == 1


@pytest.mark.django_db
def test_student_can_enroll_idempotently_and_wrong_role_is_blocked(teacher, student):
    course = Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Visible to learners.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )
    client = APIClient()
    client.force_authenticate(student)

    first = client.post(f"/api/courses/{course.id}/enroll/", {}, format="json")
    second = client.post(f"/api/courses/{course.id}/enroll/", {}, format="json")

    assert first.status_code == 201
    assert second.status_code == 200
    assert Enrollment.objects.filter(student=student, course=course).count() == 1

    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    forbidden = teacher_client.post(
        f"/api/courses/{course.id}/enroll/",
        {},
        format="json",
    )
    assert forbidden.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_cannot_access_course_api(teacher):
    Course.objects.create(
        teacher=teacher,
        title="Published",
        description="Description",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )

    response = APIClient().get("/api/courses/")

    assert response.status_code == 401
