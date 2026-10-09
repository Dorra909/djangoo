import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from chatbot.models import ChatMessage, ChatSession
from chatbot.services import LLMService


User = get_user_model()


@pytest.fixture
def teacher(db):
    return User.objects.create_user(
        email="chat.teacher@example.com",
        password="Strong-pass-123!",
        full_name="Chat Teacher",
        role=User.Role.TEACHER,
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        email="chat.student@example.com",
        password="Strong-pass-123!",
        full_name="Chat Student",
        role=User.Role.STUDENT,
    )


@pytest.mark.django_db
def test_chat_session_persists_user_and_mock_assistant_messages(teacher, settings):
    settings.LLM_API_KEY = ""
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
    assert sent.data["assistantMessage"]["content"]
    assert isinstance(sent.data["userMessage"]["id"], str)
    assert history.status_code == 200
    assert [message["role"] for message in history.data] == ["user", "assistant"]
    assert ChatMessage.objects.filter(session_id=session_id).count() == 2
    assert ChatSession.objects.get(id=session_id).title == "Explique les hooks React."


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


def test_llm_service_uses_configured_provider_and_api_key(monkeypatch, settings):
    settings.LLM_API_KEY = "test-secret"
    settings.LLM_API_URL = "https://llm.example.test/chat"
    settings.LLM_MODEL = "test-model"
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

        def read(self):
            return json.dumps(
                {"choices": [{"message": {"content": "Provider response"}}]}
            ).encode()

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["auth"] = request.get_header("Authorization")
        captured["payload"] = json.loads(request.data)
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("chatbot.services.urlopen", fake_urlopen)
    response = LLMService().reply([{"role": "user", "content": "Hello"}])

    assert response == "Provider response"
    assert captured["url"] == settings.LLM_API_URL
    assert captured["auth"] == "Bearer test-secret"
    assert captured["payload"]["model"] == "test-model"
    assert captured["timeout"] == 30
