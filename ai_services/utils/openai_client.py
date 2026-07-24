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
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", 0.7))

    def call(self, system_prompt: str, user_message: str) -> str:
        """Call OpenAI API with system + user prompt."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=self.temperature,
            max_tokens=500,
        )
        return response.choices[0].message.content
