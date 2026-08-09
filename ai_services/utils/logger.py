import json
import logging
from datetime import datetime, timezone
from pathlib import Path

# Per Technical Spec Section 10 (Observability): "Full logging of every
# AI call (prompt + response) for debugging and improvement."
_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_DIR.mkdir(exist_ok=True)

_logger = logging.getLogger("iris_ai")
_logger.setLevel(logging.INFO)
if not _logger.handlers:
    _handler = logging.FileHandler(_LOG_DIR / "ai_calls.log", encoding="utf-8")
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_handler)


def log_ai_call(
    agent_name: str,
    system_prompt: str,
    user_message: str,
    response: str,
    usage: dict | None = None,
) -> None:
    """Log one AI call (agent, prompt, response, token usage) as a JSON line."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": agent_name,
        "system_prompt": system_prompt,
        "user_message": user_message,
        "response": response,
        "usage": usage,
    }
    _logger.info(json.dumps(entry, ensure_ascii=False))
