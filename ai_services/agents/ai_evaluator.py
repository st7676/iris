import json

from agents.base_agent import BaseAgent
from prompts.evaluator import EVALUATOR_SYSTEM_PROMPT, EVALUATOR_USER_PROMPT
from utils.guardrails import sanitize_user_input


class AIEvaluator(BaseAgent):
    def get_system_prompt(self) -> str:
        return EVALUATOR_SYSTEM_PROMPT

    def evaluate(
        self, ideal_chain: list, actual_chain: list, final_severity: str, language: str = "en"
    ) -> dict:
        """Evaluate the user's performance."""
        # ideal_chain comes from our own scenario data (trusted). actual_chain's
        # action names are derived from client-supplied evidence_type/decision
        # strings (no allow-list on those fields) -- same injection surface as
        # the Mentor's user_question, so each one gets the same filtering.
        ideal_str = " -> ".join(a["action"] for a in ideal_chain)
        actual_str = " -> ".join(sanitize_user_input(a["action"]) for a in actual_chain)

        prompt = EVALUATOR_USER_PROMPT.format(
            ideal_chain=ideal_str,
            actual_chain=actual_str,
            final_severity=final_severity,
        )

        response_text = self.call(prompt, language=language)
        cleaned = self._strip_markdown_fence(response_text)
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"AI Evaluator returned non-JSON response: {response_text!r}") from exc
        self._validate_result(result, response_text)
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
