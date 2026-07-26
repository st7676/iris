import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

# Load ai_services/.env by absolute path, not by CWD. This module gets
# imported both when running from ai_services/ directly (tests, main.py)
# and when imported cross-project from backend/ (see app/core/ai_bridge.py)
# -- relying on load_dotenv()'s CWD-search would silently miss the key
# in the second case.
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)


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

    def call(self, system_prompt: str, user_message: str) -> str:
        """
        Call OpenAI API with system + user prompt. Falls back to a
        faster/cheaper model if the primary call times out or errors, per
        the Team Workflow's "AI latency too high" risk mitigation
        (">5 sec -> fallback to GPT-3.5-turbo or mock responses").
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        try:
            return self._request(self.model, messages)
        except Exception:
            return self._request(self.fallback_model, messages)

    def _request(self, model: str, messages: list) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=500,
            timeout=self.timeout_seconds,
        )
        return response.choices[0].message.content
