import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from chatbot.models import ChatMessage, ChatSession
from chatbot.services import LLMService
from courses.models import Course, Enrollment


User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="chat.teacher@example.com",
        password="test-password-123",
        full_name="Chat Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="chat.student@example.com",
        password="test-password-123",
        full_name="Chat Student",
        role=User.Role.STUDENT,
    )


@pytest.fixture
def course(teacher):
    return Course.objects.create(
        teacher=teacher,
        title="Chat course",
        description="A course for grounded assistant tests.",
        category="Development",
        level=Course.Level.BEGINNER,
        is_published=True,
    )


@pytest.mark.django_db
def test_chat_session_persists_user_and_mock_assistant_messages(teacher, settings):
    settings.GROQ_API_KEY = ""
    client = APIClient()
    client.force_authenticate(teacher)

    created = client.post("/api/chat/sessions/", {}, format="json")
    session_id = created.data["id"]
    sent = client.post(
        f"/api/chat/sessions/{session_id}/messages/",
        {"content": "Explique les hooks React."},
        format="json",
    )
    history = client.get(f"/api/chat/sessions/{session_id}/messages/")

    assert created.status_code == 201
    assert sent.status_code == 200
    assert sent.data["userMessage"]["role"] == "user"
    assert sent.data["userMessage"]["content"] == "Explique les hooks React."
    assert sent.data["assistantMessage"]["role"] == "assistant"
    assert "Réponse simulée" in sent.data["assistantMessage"]["content"]
    assert isinstance(sent.data["userMessage"]["id"], str)
    assert history.status_code == 200
    assert [message["role"] for message in history.data] == ["user", "assistant"]
    assert ChatMessage.objects.filter(session_id=session_id).count() == 2
    assert ChatSession.objects.get(id=session_id).title == "Explique les hooks React."


@pytest.mark.django_db
def test_chatbot_message_requires_student_course_enrollment(course, student):
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        "/api/chatbot/message/",
        {"course_id": course.id, "message": "Résume le chapitre."},
        format="json",
    )

    assert response.status_code == 403
    assert ChatSession.objects.filter(user=student).count() == 0


@pytest.mark.django_db
def test_enrolled_student_chat_response_cites_course_sources(
    course,
    student,
    monkeypatch,
):
    Enrollment.objects.create(student=student, course=course)
    source = {
        "document_id": 42,
        "document_title": "Chapitre 1",
        "page_number": 3,
        "chunk_index": 0,
        "content": "Les variables stockent des valeurs.",
        "score": 0.9,
    }
    monkeypatch.setattr("chatbot.services.retrieve", lambda *args, **kwargs: [source])

    class FakeGroq:
        api_key = "test-key"

        def chat(self, messages, **kwargs):
            assert "Les variables stockent des valeurs." in messages[1]["content"]
            return "Une variable stocke une valeur."

    monkeypatch.setattr("chatbot.services.GroqClient", FakeGroq)
    client = APIClient()
    client.force_authenticate(student)

    response = client.post(
        "/api/chatbot/message/",
        {"course_id": course.id, "message": "À quoi sert une variable ?"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["assistantMessage"]["sources"] == [
        {
            "documentId": 42,
            "title": "Chapitre 1",
            "page": 3,
            "courseTitle": course.title,
        }
    ]
    assert "page 3" in response.data["assistantMessage"]["content"]
    assert response.data["session"]["courseId"] == course.id


@pytest.mark.django_db
def test_chat_sessions_and_history_are_owner_scoped(teacher, student):
    session = ChatSession.objects.create(user=teacher)
    client = APIClient()
    client.force_authenticate(student)

    listing = client.get("/api/chat/sessions/")
    history = client.get(f"/api/chat/sessions/{session.id}/messages/")
    deleted = client.delete(f"/api/chat/sessions/{session.id}/")

    assert listing.status_code == 200
    assert listing.data["count"] == 0
    assert history.status_code == 404
    assert deleted.status_code == 404
    assert ChatSession.objects.filter(id=session.id).exists()


@pytest.mark.django_db
def test_chat_clear_deletes_only_owned_session_history(teacher):
    session = ChatSession.objects.create(user=teacher)
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.USER,
        content="Clear this.",
    )
    client = APIClient()
    client.force_authenticate(teacher)

    response = client.delete(f"/api/chat/sessions/{session.id}/")

    assert response.status_code == 204
    assert not ChatSession.objects.filter(id=session.id).exists()
    assert not ChatMessage.objects.filter(session_id=session.id).exists()


def test_llm_service_delegates_to_groq_client(monkeypatch):
    captured = {}

    class FakeGroqClient:
        def chat(self, messages):
            captured["messages"] = messages
            return "Réponse Groq"

    monkeypatch.setattr("chatbot.services.GroqClient", FakeGroqClient)

    response = LLMService().reply([{"role": "user", "content": "Hello"}])

    assert response == "Réponse Groq"
    assert captured["messages"] == [{"role": "user", "content": "Hello"}]
