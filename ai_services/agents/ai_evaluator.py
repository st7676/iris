import json
import os

from agents.base_agent import BaseAgent
from prompts.evaluator import EVALUATOR_SYSTEM_PROMPT, EVALUATOR_USER_PROMPT
from utils.guardrails import sanitize_user_input


class AIEvaluator(BaseAgent):
    # LLMs occasionally wrap JSON in prose or emit an out-of-range score
    # despite the prompt's explicit shape/range requirements. Rather than
    # failing the whole evaluation on the first malformed response, re-prompt
    # with the bad output and ask the model to correct it, up to this many
    # extra attempts.
    MAX_JSON_RETRIES = int(os.getenv("OPENAI_EVALUATOR_MAX_JSON_RETRIES", 2))

    def get_system_prompt(self, scenario_id: str | None = None) -> str:
        return EVALUATOR_SYSTEM_PROMPT

    def evaluate(self, ideal_chain: list, actual_chain: list, final_severity: str) -> dict:
        """Evaluate the user's performance."""
        # ideal_chain comes from our own scenario data (trusted). actual_chain's
        # action names are derived from client-supplied evidence_type/decision
        # strings (no allow-list on those fields) -- same injection surface as
        # the Mentor's user_question, so each one gets the same filtering.
        ideal_str = " -> ".join(a["action"] for a in ideal_chain)
        actual_str = " -> ".join(sanitize_user_input(a["action"]) for a in actual_chain)

        base_prompt = EVALUATOR_USER_PROMPT.format(
            ideal_chain=ideal_str,
            actual_chain=actual_str,
            final_severity=final_severity,
        )

        prompt = base_prompt
        last_error: ValueError | None = None
        for attempt in range(self.MAX_JSON_RETRIES + 1):
            response_text = self.call(prompt)
            try:
                return self._parse_and_validate(response_text)
            except ValueError as exc:
                last_error = exc
                if attempt < self.MAX_JSON_RETRIES:
                    prompt = (
                        f"{base_prompt}\n\n"
                        f"Your previous response was invalid: {exc}\n"
                        f"Previous response: {response_text!r}\n\n"
                        "Reply again with ONLY the corrected, valid JSON object in the "
                        "exact shape requested -- no markdown fences, no extra text."
                    )
        raise last_error

    @classmethod
    def _parse_and_validate(cls, response_text: str) -> dict:
        cleaned = cls._strip_markdown_fence(response_text)
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"AI Evaluator returned non-JSON response: {response_text!r}") from exc
        cls._validate_result(result, response_text)
        return result

    @staticmethod
    def _strip_markdown_fence(text: str) -> str:
        """Strip ```json ... ``` fences some models wrap JSON responses in."""
        stripped = text.strip()
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[1] if "\n" in stripped else stripped
            if stripped.endswith("```"):
                stripped = stripped.rsplit("```", 1)[0]
        return stripped.strip()

    @staticmethod
    def _validate_result(result: dict, raw_response: str) -> None:
        """Guard against a malformed/off-spec LLM response reaching the score
        calculation (backend/app/api/routes/incidents.py sums these fields
        directly), since the prompt asking for this exact shape is only a
        request, not a guarantee.
        """
        if not isinstance(result, dict):
            raise ValueError(f"AI Evaluator response was not a JSON object: {raw_response!r}")
        for field in ("detection_score", "decision_score", "response_score"):
            value = result.get(field)
            if not isinstance(value, int) or isinstance(value, bool) or not (0 <= value <= 100):
                raise ValueError(
                    f"AI Evaluator returned an invalid '{field}' ({value!r}): {raw_response!r}"
                )
