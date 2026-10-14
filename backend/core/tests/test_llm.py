import json
import sys
from types import SimpleNamespace

import pytest
from rest_framework.exceptions import APIException

from core.services.llm import (
    GroqClient,
    GroqRateLimitError,
    GroqTimeoutError,
)


class FakeStatusError(Exception):
    def __init__(self, status_code):
        self.status_code = status_code


class FakeTimeoutError(Exception):
    pass


class FakeConnectionError(Exception):
    pass


class FakeGroqClient:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self.create_completion)
        )

    def create_completion(self, **kwargs):
        self.calls.append(kwargs)
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return SimpleNamespace(
            choices=[
                SimpleNamespace(message=SimpleNamespace(content=response))
            ]
        )


@pytest.fixture
def fake_groq_module(monkeypatch):
    monkeypatch.setitem(
        sys.modules,
        "groq",
        SimpleNamespace(
            APIConnectionError=FakeConnectionError,
            APIStatusError=FakeStatusError,
            APITimeoutError=FakeTimeoutError,
            Groq=object,
        ),
    )


def test_missing_key_returns_clear_mock_response(settings):
    settings.GROQ_API_KEY = ""
    client = GroqClient()

    response = client.chat([{"role": "user", "content": "Question"}])

    assert "Réponse simulée" in response
    assert "GROQ_API_KEY" in response


def test_mock_json_mode_returns_valid_json(settings):
    settings.GROQ_API_KEY = ""

    response = GroqClient().chat(
        [{"role": "user", "content": "Generate JSON"}],
        json_mode=True,
    )

    assert json.loads(response)["mock"] is True


def test_chat_uses_requested_model_timeout_and_json_mode(
    fake_groq_module,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    settings.GROQ_MODEL = "test-model"
    settings.GROQ_TIMEOUT = 12.5
    fake_client = FakeGroqClient([" {\"ok\": true} "])
    client = GroqClient(client=fake_client)

    response = client.chat(
        [{"role": "user", "content": "Generate JSON"}],
        temperature=0.4,
        max_tokens=321,
        json_mode=True,
    )

    assert response == '{"ok": true}'
    assert fake_client.calls == [
        {
            "model": "test-model",
            "messages": [{"role": "user", "content": "Generate JSON"}],
            "temperature": 0.4,
            "max_tokens": 321,
            "response_format": {"type": "json_object"},
        }
    ]
    assert client.timeout == 12.5


def test_chat_retries_rate_limit_then_succeeds(
    fake_groq_module,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    fake_client = FakeGroqClient([FakeStatusError(429), "success"])
    monkeypatch.setattr("core.services.llm.time.sleep", lambda _: None)
    client = GroqClient(client=fake_client)

    assert client.chat([{"role": "user", "content": "Question"}]) == "success"
    assert len(fake_client.calls) == 2


def test_chat_returns_clear_rate_limit_error_after_retries(
    fake_groq_module,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    fake_client = FakeGroqClient(
        [FakeStatusError(429), FakeStatusError(429), FakeStatusError(429)]
    )
    monkeypatch.setattr("core.services.llm.time.sleep", lambda _: None)

    with pytest.raises(GroqRateLimitError) as error:
        GroqClient(client=fake_client).chat(
            [{"role": "user", "content": "Question"}]
        )

    assert error.value.status_code == 429
    assert len(fake_client.calls) == 3


def test_chat_maps_exhausted_timeout_to_gateway_timeout(
    fake_groq_module,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    fake_client = FakeGroqClient(
        [FakeTimeoutError(), FakeTimeoutError(), FakeTimeoutError()]
    )
    monkeypatch.setattr("core.services.llm.time.sleep", lambda _: None)

    with pytest.raises(GroqTimeoutError) as error:
        GroqClient(client=fake_client).chat(
            [{"role": "user", "content": "Question"}]
        )

    assert error.value.status_code == 504


def test_chat_maps_provider_failure_to_api_exception(
    fake_groq_module,
    monkeypatch,
    settings,
):
    settings.GROQ_API_KEY = "test-key"
    fake_client = FakeGroqClient([FakeStatusError(503)] * 3)
    monkeypatch.setattr("core.services.llm.time.sleep", lambda _: None)

    with pytest.raises(APIException) as error:
        GroqClient(client=fake_client).chat(
            [{"role": "user", "content": "Question"}]
        )

    assert error.value.status_code == 502
    assert len(fake_client.calls) == 3
