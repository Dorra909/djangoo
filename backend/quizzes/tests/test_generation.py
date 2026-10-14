import json

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from courses.models import Course, Lesson
from quizzes.models import Quiz
from rag.models import CourseDocument

User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="generation.teacher@example.com",
        password="test-password",
        full_name="Generation Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def course(teacher):
    return Course.objects.create(
        teacher=teacher,
        title="Generation course",
        description="A course for quiz generation tests.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )


def generation_payload(**overrides):
    payload = {
        "topic": "Variables",
        "num_questions": 1,
        "difficulty": "moyen",
        "types": ["multiple_choice"],
        "language": "fr",
    }
    payload.update(overrides)
    return payload


def valid_draft(source=None):
    question = {
        "text": "À quoi sert une variable ?",
        "type": "multiple_choice",
        "options": ["À stocker une valeur", "À afficher une page"],
        "correctAnswer": 0,
        "explanation": "Une variable associe un nom à une valeur.",
        "points": 2,
    }
    if source:
        question["source"] = source
    return {"title": "Variables", "questions": [question]}


@pytest.mark.django_db
def test_generation_returns_unsaved_validated_mock_draft(course, teacher, settings):
    settings.GROQ_API_KEY = ""
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/generate/",
        generation_payload(course_id=course.id),
        format="json",
    )

    assert response.status_code == 200
    assert response.data["draft"]["creationMode"] == "AI"
    assert response.data["draft"]["courseId"] == course.id
    assert response.data["draft"]["mock"] is True
    assert len(response.data["draft"]["questions"]) == 1
    assert Quiz.objects.count() == 0


@pytest.mark.django_db
def test_generation_retries_invalid_json_once_then_returns_draft(
    course,
    teacher,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"

    class FakeGroq:
        calls = 0

        def __init__(self):
            pass

        def chat(self, *args, **kwargs):
            self.calls += 1
            if self.calls == 1:
                return "not JSON"
            return json.dumps(valid_draft(), ensure_ascii=False)

    fake_client = FakeGroq()
    monkeypatch.setattr(
        "quizzes.generation.GroqClient",
        lambda: fake_client,
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/generate/",
        generation_payload(course_id=course.id),
        format="json",
    )

    assert response.status_code == 200
    assert response.data["draft"]["questions"][0]["points"] == 2
    assert fake_client.calls == 2
    assert Quiz.objects.count() == 0


@pytest.mark.django_db
def test_generation_normalizes_correct_answer_text_from_groq(
    course,
    teacher,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    draft = valid_draft()
    draft["questions"][0]["correctAnswer"] = "À stocker une valeur"

    class FakeGroq:
        def chat(self, *args, **kwargs):
            return json.dumps(draft, ensure_ascii=False)

    monkeypatch.setattr("quizzes.generation.GroqClient", FakeGroq)
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/generate/",
        generation_payload(course_id=course.id),
        format="json",
    )

    assert response.status_code == 200
    assert response.data["draft"]["questions"][0]["correctAnswer"] == 0
    assert Quiz.objects.count() == 0


@pytest.mark.django_db
def test_rag_generation_only_accepts_and_cites_requested_ready_pdf(
    course,
    teacher,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    document = CourseDocument.objects.create(
        course=course,
        uploaded_by=teacher,
        file=SimpleUploadedFile(
            "chapter.pdf",
            b"%PDF-1.7 example",
            content_type="application/pdf",
        ),
        title="Chapitre 1",
        status=CourseDocument.Status.READY,
    )
    source = {
        "document_id": document.id,
        "document_title": document.title,
        "page_number": 4,
        "chunk_index": 0,
        "content": "Une variable stocke une valeur.",
        "score": 0.9,
    }
    monkeypatch.setattr("quizzes.generation.retrieve", lambda *args, **kwargs: [source])

    class FakeGroq:
        def chat(self, *args, **kwargs):
            return json.dumps(
                valid_draft({"documentId": document.id, "page": 4}),
                ensure_ascii=False,
            )

    monkeypatch.setattr("quizzes.generation.GroqClient", FakeGroq)
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/generate/",
        generation_payload(
            course_id=course.id,
            document_ids=[document.id],
        ),
        format="json",
    )

    assert response.status_code == 200
    assert response.data["draft"]["creationMode"] == "RAG"
    assert response.data["draft"]["questions"][0]["source"] == {
        "documentId": document.id,
        "page": 4,
        "title": "Chapitre 1",
    }
    assert Quiz.objects.count() == 0


@pytest.mark.django_db
def test_generation_uses_only_requested_teachers_lessons(course, teacher, settings):
    settings.GROQ_API_KEY = ""
    lesson = Lesson.objects.create(
        course=course,
        title="Variables",
        content="Une variable associe un nom et une valeur.",
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.post(
        "/api/quizzes/generate/",
        generation_payload(lesson_ids=[lesson.id]),
        format="json",
    )

    assert response.status_code == 200
    assert response.data["draft"]["courseId"] == course.id
    assert response.data["draft"]["creationMode"] == "AI"
    assert Quiz.objects.count() == 0
