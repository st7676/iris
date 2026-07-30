import re

# Per Technical Spec Section 10 (Security): "user input (hint requests) is
# filtered before being sent to the LLM (basic prompt injection guardrails)."
# This is intentionally basic -- it neutralizes the common "ignore your
# instructions" / "reveal your prompt" phrasings and caps length. It is a
# defense-in-depth layer, not a substitute for the system prompt's own
# constraints (MENTOR_SYSTEM_PROMPT already refuses to give direct answers).
MAX_INPUT_LENGTH = 500

_INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior|above) instructions",
    r"disregard (all )?(previous|prior|above) instructions",
    r"reveal (your|the) (system )?prompt",
    r"you are now",
    r"forget (all )?(previous|prior|above)",
    r"new instructions?:",
]


def sanitize_user_input(text: str) -> str:
    """Truncate and neutralize obvious prompt-injection attempts."""
    if not text:
        return ""
    cleaned = text[:MAX_INPUT_LENGTH]
    for pattern in _INJECTION_PATTERNS:
        cleaned = re.sub(pattern, "[filtered]", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()
