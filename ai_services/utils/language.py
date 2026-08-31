"""Response-language instructions appended to agent system prompts.

Keyed by the same two-letter codes the frontend sends in the X-Language
header (see frontend/src/lib/language.ts) -- "en" and "he" today, more can
be added here as the app supports more languages.
"""

LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English.",
    "he": (
        "Respond in Hebrew (עברית). Write all narrative text in Hebrew; "
        "technical terms, log field names, and IP/file paths may stay in "
        "English where translating them would be unnatural."
    ),
}

DEFAULT_LANGUAGE = "en"


def language_instruction(language: str) -> str:
    return LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS[DEFAULT_LANGUAGE])
