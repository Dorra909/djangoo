import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from rest_framework.exceptions import APIException


class LLMProviderError(APIException):
    status_code = 502
    default_detail = "The assistant provider could not process this message."
    default_code = "llm_provider_error"


class LLMService:
    def __init__(self, api_key=None, api_url=None, model=None):
        self.api_key = settings.LLM_API_KEY if api_key is None else api_key
        self.api_url = settings.LLM_API_URL if api_url is None else api_url
        self.model = settings.LLM_MODEL if model is None else model

    def reply(self, messages):
        if not self.api_key:
            return (
                "Merci pour votre question. Je peux vous aider à comprendre ce "
                "sujet étape par étape. Précisez la notion ou partagez un exemple "
                "pour que je vous guide."
            )
        return self._request_provider(messages)

    def _request_provider(self, messages):
        payload = json.dumps(
            {
                "model": self.model,
                "messages": messages,
            }
        ).encode("utf-8")
        request = Request(
            self.api_url,
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise LLMProviderError() from exc

        try:
            content = result["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMProviderError(
                "The assistant provider returned an invalid response."
            ) from exc
        if not isinstance(content, str) or not content.strip():
            raise LLMProviderError(
                "The assistant provider returned an empty response."
            )
        return content.strip()
