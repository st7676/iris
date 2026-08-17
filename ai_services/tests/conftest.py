"""
Shared fixtures/helpers for the OpenAIClient regression tests
(test_openai_client_rate_limit_retry.py, test_openai_client_thread_safety.py).
"""

import os
import sys
from unittest.mock import MagicMock

import pytest

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from utils.openai_client import OpenAIClient  # noqa: E402


@pytest.fixture
def openai_client(monkeypatch):
    """
    A real OpenAIClient wired to a dummy API key. These tests are mocked
    (no real API calls) and meant to be safe to run without a real
    OPENAI_API_KEY configured -- without this, OpenAI(api_key=None) raises
    at construction time, before a test ever gets to patch
    `.chat.completions.create`. Callers still patch that themselves with
    their own side_effect, since it differs per test.
    """
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-not-a-real-key")
    return OpenAIClient()


def mock_completion(content: str, *, prompt_tokens: int, completion_tokens: int, total_tokens: int):
    """Build a fake OpenAI chat-completion response object."""
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    response.usage = MagicMock(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
    )
    return response
