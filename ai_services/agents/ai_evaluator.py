import json

from agents.base_agent import BaseAgent
from prompts.evaluator import EVALUATOR_SYSTEM_PROMPT


class AIEvaluator(BaseAgent):
    def get_system_prompt(self) -> str:
        return EVALUATOR_SYSTEM_PROMPT

    def evaluate(self, ideal_chain: list, actual_chain: list, final_severity: str) -> dict:
        """Evaluate the user's performance."""
        ideal_str = " -> ".join(a["action"] for a in ideal_chain)
        actual_str = " -> ".join(a["action"] for a in actual_chain)

        prompt = EVALUATOR_SYSTEM_PROMPT.format(
            ideal_chain=ideal_str,
            actual_chain=actual_str,
            final_severity=final_severity,
        )

        response_text = self.call(prompt)
        cleaned = self._strip_markdown_fence(response_text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"AI Evaluator returned non-JSON response: {response_text!r}") from exc

    @staticmethod
    def _strip_markdown_fence(text: str) -> str:
        """Strip ```json ... ``` fences some models wrap JSON responses in."""
        stripped = text.strip()
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[1] if "\n" in stripped else stripped
            if stripped.endswith("```"):
                stripped = stripped.rsplit("```", 1)[0]
        return stripped.strip()
