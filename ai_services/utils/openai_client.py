import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, RateLimitError

# Load ai_services/.env by absolute path, not by CWD. This module gets
# imported both when running from ai_services/ directly (tests, main.py)
# and when imported cross-project from backend/ (see app/core/ai_bridge.py)
# -- relying on load_dotenv()'s CWD-search would silently miss the key
# in the second case.
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

logger = logging.getLogger("iris.ai.openai_client")


class OpenAIClient:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.fallback_model = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-4o-mini")
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", 0.7))
        # Per Technical Spec Section 10: Commander/Mentor should respond
        # within <3s. Measured Day 13 (see ai_services/README.md): ~2.2-2.9s
        # on gpt-4o. This timeout is a safety net so a slow/hung call
        # doesn't block a request (or the incident WebSocket loop)
        # indefinitely -- not the expected happy path.
        self.timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", 8))
        # Clamped to >=0: a misconfigured negative value must not skip the
        # retry loop's only iteration, which would leave `last_error`
        # unset and turn a real RateLimitError into a bare `raise None`.
        self.max_rate_limit_retries = max(0, int(os.getenv("OPENAI_MAX_RATE_LIMIT_RETRIES", 2)))

    def call(self, system_prompt: str, user_message: str) -> tuple[str, dict | None]:
        """
        Call OpenAI API with system + user prompt. Falls back to a
        faster/cheaper model if the primary call times out or errors, per
        the Team Workflow's "AI latency too high" risk mitigation
        (">5 sec -> fallback to GPT-3.5-turbo or mock responses").

        Returns (content, usage). Usage is returned directly rather than
        stashed on `self` (as it used to be, via a `last_usage` attribute):
        Commander/Mentor/Evaluator are singletons wrapping one shared
        OpenAIClient each (see backend/app/core/ai_bridge.py), and
        concurrent requests for different incidents run on separate
        threads (FastAPI's run_in_threadpool). Shared mutable state on
        the client meant one thread could overwrite `last_usage` before
        another thread read it for its own log entry -- silently
        misattributing token counts between unrelated calls in the cost
        log. Returning usage from the call itself makes that impossible.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        try:
            return self._request_with_retry(self.model, messages)
        except Exception as exc:
            # Log the primary model's real failure before retrying against
            # the fallback -- otherwise, if the fallback fails too, the
            # exception that reaches the caller only describes the
            # fallback's error and the root cause is lost with no log
            # entry anywhere (log_ai_call is only reached on success).
            logger.warning(
                "Primary model %r failed (%s: %s); retrying with fallback model %r.",
                self.model,
                type(exc).__name__,
                exc,
                self.fallback_model,
            )
            return self._request_with_retry(self.fallback_model, messages)

    def _request_with_retry(self, model: str, messages: list) -> tuple[str, dict | None]:
        """
        Retry with exponential backoff specifically on 429 rate limits --
        these are transient and usually resolve within a couple seconds,
        so it's worth retrying the *same* model before giving up on it
        (per Technical Spec Section 10: "API rate limit: catch, queue,
        retry"). Other errors (timeout, 5xx, etc.) aren't retried here --
        they bubble up to call()'s fallback-model logic instead.
        """
        last_error: RateLimitError | None = None
        for attempt in range(self.max_rate_limit_retries + 1):
            try:
                return self._request(model, messages)
            except RateLimitError as exc:
                last_error = exc
                if attempt < self.max_rate_limit_retries:
                    time.sleep(2**attempt)  # 1s, 2s, 4s...
        raise last_error

    def _request(self, model: str, messages: list) -> tuple[str, dict | None]:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=500,
            timeout=self.timeout_seconds,
        )
        usage = None
        if response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
                "model": model,
            }
        return response.choices[0].message.content, usage
