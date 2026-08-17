"""
Regression test for the retry-on-rate-limit safety net. The README
documented this as "verified by simulating a flaky API that fails twice
then succeeds" (Technical Spec Section 10: "API rate limit: catch,
queue, retry") -- code review correctly pointed out that claim wasn't
backed by an actual test in the repo. This closes that gap.

Uses a fake OpenAI client (no real API calls), so it's fast, free, and
safe to run automatically alongside the other regression tests.
"""

from unittest.mock import patch

import httpx
from openai import RateLimitError

from conftest import mock_completion


def _rate_limit_error() -> RateLimitError:
    request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    response = httpx.Response(status_code=429, request=request)
    return RateLimitError("rate limited", response=response, body=None)


def test_retries_and_recovers_from_a_flaky_rate_limited_api(openai_client):
    client = openai_client
    client.max_rate_limit_retries = 2

    call_count = {"n": 0}

    def flaky_then_succeeds(*, model, messages, **kwargs):
        call_count["n"] += 1
        if call_count["n"] <= 2:
            raise _rate_limit_error()
        return mock_completion(
            "recovered after retries", prompt_tokens=10, completion_tokens=5, total_tokens=15
        )

    with patch.object(
        client.client.chat.completions, "create", side_effect=flaky_then_succeeds
    ), patch("utils.openai_client.time.sleep"):  # skip real backoff delays in the test
        content, usage = client.call("system prompt", "user message")

    assert content == "recovered after retries"
    assert usage["total_tokens"] == 15
    assert call_count["n"] == 3  # 1 initial attempt + 2 retries


def test_gives_up_after_max_retries_and_falls_back_to_the_fallback_model(openai_client):
    client = openai_client
    client.max_rate_limit_retries = 1
    client.model = "primary-model"
    client.fallback_model = "fallback-model"

    models_called = []

    def always_rate_limited(*, model, messages, **kwargs):
        models_called.append(model)
        if model == client.fallback_model:
            return mock_completion(
                "fallback saved the day", prompt_tokens=10, completion_tokens=5, total_tokens=15
            )
        raise _rate_limit_error()

    with patch.object(
        client.client.chat.completions, "create", side_effect=always_rate_limited
    ), patch("utils.openai_client.time.sleep"):
        content, _ = client.call("system prompt", "user message")

    assert content == "fallback saved the day"
    # Primary model: 1 initial attempt + 1 retry (both rate-limited), then
    # call() catches the exhausted RateLimitError and tries the fallback model.
    assert models_called == ["primary-model", "primary-model", "fallback-model"]
