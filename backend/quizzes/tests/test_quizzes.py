import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from courses.models import Course, Enrollment
from quizzes.models import Quiz, QuizAttempt


User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="quiz.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Quiz Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def other_teacher(db):
    return User.objects.create_user(
        email="quiz.other@example.com",
        password="Strong-pass-123!",
        full_name="Other Quiz Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="quiz.student@example.com",
        password="Strong-pass-123!",
        full_name="Quiz Student",
        role=User.Role.STUDENT,
    )


@pytest.fixture
def course(teacher):
    return Course.objects.create(
        teacher=teacher,
        title="Quiz course",
        description="A course for quiz tests.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )


def quiz_payload(course, title="Quiz", answer=1):
    return {
        "title": title,
        "courseId": course.id,
        "duration": 20,
        "passingScore": 50,
        "questions": [
            {
                "text": "Which option is correct?",
                "type": "multiple_choice",
                "options": ["Wrong", "Correct"],
                "correctAnswer": answer,
                "explanation": "The second answer is correct.",
            },
            {
                "text": "Is this statement true?",
                "type": "true_false",
                "options": ["Vrai", "Faux"],
                "correctAnswer": 0,
            },
        ],
    }


@pytest.mark.django_db
def test_teacher_can_create_nested_quiz(course, teacher):
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )

    assert response.status_code == 201
    assert response.data["teacherId"] == teacher.id
    assert response.data["courseId"] == course.id
    assert response.data["questions"][0]["correctAnswer"] == 1
    assert response.data["questions"][0]["options"] == ["Wrong", "Correct"]
    assert response.data["attemptCount"] == 0
    quiz = Quiz.objects.get()
    assert quiz.questions.count() == 2
    assert quiz.questions.first().choices.filter(is_correct=True).count() == 1


@pytest.mark.django_db
def test_teacher_cannot_create_quiz_for_another_teachers_course(
    other_teacher,
    course,
):
    client = APIClient()
    client.force_authenticate(other_teacher)

    response = client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )

    assert response.status_code == 400
    assert "courseId" in response.data["errors"]
    assert Quiz.objects.count() == 0


@pytest.mark.django_db
def test_teacher_can_update_nested_quiz_questions(course, teacher):
    client = APIClient()
    client.force_authenticate(teacher)
    create_response = client.post(
        "/api/quizzes/",
        quiz_payload(course),
        format="json",
    )
    quiz_id = create_response.data["id"]
    payload = quiz_payload(course, title="Updated quiz", answer=0)

    response = client.patch(
        f"/api/quizzes/{quiz_id}/",
        payload,
        format="json",
    )

    assert response.status_code == 200
    quiz = Quiz.objects.get(id=quiz_id)
    assert quiz.title == "Updated quiz"
    assert quiz.questions.count() == 2
    assert quiz.questions.first().choices.filter(is_correct=True).first().text == "Wrong"


@pytest.mark.django_db
def test_student_quiz_payload_never_contains_answer_key(course, teacher, student):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)

    listing = student_client.get("/api/quizzes/")
    detail = student_client.get(f"/api/quizzes/{Quiz.objects.get().id}/")

    assert listing.status_code == 200
    question = listing.data["results"][0]["questions"][0]
    assert question["options"] == ["Wrong", "Correct"]
    assert "correctAnswer" not in question
    assert "explanation" not in question
    assert detail.status_code == 200
    assert "correctAnswer" not in detail.data["questions"][0]


@pytest.mark.django_db
def test_server_grades_attempt_and_returns_review_only_after_submit(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get()
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)

    start = student_client.post(
        f"/api/quizzes/{quiz.id}/attempts/",
        {},
        format="json",
    )
    assert start.status_code == 201
    assert "correctAnswer" not in start.data["questions"][0]
    assert "explanation" not in start.data["questions"][0]

    submitted = student_client.post(
        f"/api/quizzes/attempts/{start.data['id']}/submit/",
        {"answers": [1, -1], "timeTaken": 3},
        format="json",
    )

    assert submitted.status_code == 200
    assert submitted.data["score"] == 50
    assert submitted.data["passed"] is True
    assert submitted.data["answers"] == [1, -1]
    assert submitted.data["review"][0]["selectedIndex"] == 1
    assert submitted.data["review"][0]["correctIndex"] == 1
    assert submitted.data["review"][0]["is_correct"] is True
    assert submitted.data["review"][1]["is_correct"] is False
    assert QuizAttempt.objects.get().score == 50

    duplicate = student_client.post(
        f"/api/quizzes/attempts/{start.data['id']}/submit/",
        {"answers": [0, 0], "timeTaken": 3},
        format="json",
    )
    assert duplicate.status_code == 400


@pytest.mark.django_db
def test_student_cannot_start_without_enrollment_or_view_another_students_attempt(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get()
    student_client = APIClient()
    student_client.force_authenticate(student)

    start = student_client.post(
        f"/api/quizzes/{quiz.id}/attempts/",
        {},
        format="json",
    )
    assert start.status_code == 404
    assert QuizAttempt.objects.count() == 0

    other_student = User.objects.create_user(
        email="quiz.other.student@example.com",
        password="Strong-pass-123!",
        full_name="Other Student",
        role=User.Role.STUDENT,
    )
    attempt = QuizAttempt.objects.create(quiz=quiz, student=other_student)
    submission = student_client.post(
        f"/api/quizzes/attempts/{attempt.id}/submit/",
        {"answers": [0, 0], "timeTaken": 1},
        format="json",
    )
    assert submission.status_code == 404


@pytest.mark.django_db
def test_teacher_results_and_csv_export_are_scoped_to_owned_quiz(
    course,
    teacher,
    student,
):
    teacher_client = APIClient()
    teacher_client.force_authenticate(teacher)
    teacher_client.post("/api/quizzes/", quiz_payload(course), format="json")
    quiz = Quiz.objects.get()
    Enrollment.objects.create(student=student, course=course)
    student_client = APIClient()
    student_client.force_authenticate(student)
    attempt = student_client.post(
        f"/api/quizzes/{quiz.id}/attempts/",
        {},
        format="json",
    )
    student_client.post(
        f"/api/quizzes/attempts/{attempt.data['id']}/submit/",
        {"answers": [1, 0], "timeTaken": 4},
        format="json",
    )

    results = teacher_client.get(f"/api/quizzes/{quiz.id}/results/")
    export = teacher_client.get(f"/api/quizzes/{quiz.id}/results-csv/")

    assert results.status_code == 200
    assert results.data["attemptCount"] == 1
    assert results.data["averageScore"] == 100
    assert results.data["passRate"] == 100
    assert sum(item["count"] for item in results.data["distribution"]) == 1
    assert export.status_code == 200
    assert export["Content-Type"].startswith("text/csv")
    assert "Quiz Student" in export.content.decode("utf-8-sig")
