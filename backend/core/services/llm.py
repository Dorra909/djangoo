import json
import logging
import time

from django.conf import settings
from rest_framework.exceptions import APIException


logger = logging.getLogger(__name__)


class GroqProviderError(APIException):
    status_code = 502
    default_detail = "Le service Groq n'a pas pu traiter la demande."
    default_code = "groq_provider_error"


class GroqTimeoutError(APIException):
    status_code = 504
    default_detail = "Le service Groq n'a pas répondu à temps. Réessayez."
    default_code = "groq_timeout"


class GroqRateLimitError(APIException):
    status_code = 429
    default_detail = (
        "La limite de requêtes Groq est atteinte. Réessayez dans quelques instants."
    )
    default_code = "groq_rate_limit"


class GroqClient:
    max_retries = 2
    retry_backoff_seconds = 0.5
    mock_response = (
        "Réponse simulée : configurez GROQ_API_KEY dans le fichier .env "
        "pour activer l'assistant Groq."
    )

    def __init__(self, api_key=None, model=None, timeout=None, client=None):
        self.api_key = settings.GROQ_API_KEY if api_key is None else api_key
        self.model = settings.GROQ_MODEL if model is None else model
        self.timeout = settings.GROQ_TIMEOUT if timeout is None else timeout
        self._client = client

    def chat(self, messages, temperature=0.2, max_tokens=1024, json_mode=False):
        if not self.api_key:
            logger.info("Groq API key is not configured; returning mock response.")
            if json_mode:
                return json.dumps(
                    {"mock": True, "message": self.mock_response},
                    ensure_ascii=False,
                )
            return self.mock_response

        from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq

        for attempt in range(self.max_retries + 1):
            try:
                completion = self._get_client(Groq).chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **(
                        {"response_format": {"type": "json_object"}}
                        if json_mode
                        else {}
                    ),
                )
                content = completion.choices[0].message.content
                if not isinstance(content, str) or not content.strip():
                    raise GroqProviderError(
                        "Le service Groq a renvoyé une réponse vide ou invalide."
                    )
                return content.strip()
            except APITimeoutError as exc:
                if self._should_retry(attempt):
                    continue
                logger.error("Groq request timed out after %s attempts.", attempt + 1)
                raise GroqTimeoutError() from exc
            except APIConnectionError as exc:
                if self._should_retry(attempt):
                    continue
                logger.error(
                    "Groq connection failed after %s attempts.", attempt + 1
                )
                raise GroqProviderError() from exc
            except APIStatusError as exc:
                status_code = getattr(exc, "status_code", None)
                if status_code == 429:
                    if self._should_retry(attempt):
                        continue
                    logger.warning("Groq rate limit reached after retries.")
                    raise GroqRateLimitError() from exc
                if isinstance(status_code, int) and status_code >= 500:
                    if self._should_retry(attempt):
                        continue
                logger.error("Groq returned HTTP status %s.", status_code)
                raise GroqProviderError() from exc

        raise GroqProviderError()

    def _get_client(self, groq_class):
        if self._client is None:
            self._client = groq_class(
                api_key=self.api_key,
                timeout=self.timeout,
                max_retries=0,
            )
        return self._client

    def _should_retry(self, attempt):
        if attempt >= self.max_retries:
            return False
        delay = self.retry_backoff_seconds * (2**attempt)
        logger.warning(
            "Transient Groq failure; retrying attempt %s of %s in %.1f seconds.",
            attempt + 1,
            self.max_retries,
            delay,
        )
        time.sleep(delay)
        return True
