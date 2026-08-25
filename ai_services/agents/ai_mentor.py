from agents.base_agent import BaseAgent
from prompts.mentor import MENTOR_SYSTEM_PROMPT, MENTOR_USER_PROMPT
from utils.guardrails import sanitize_user_input


class AIMentor(BaseAgent):
    def get_system_prompt(self) -> str:
        return MENTOR_SYSTEM_PROMPT

    def provide_hint(self, user_question: str, incident_context: dict, action_history: list) -> str:
        """Provide a hint to guide the user."""
        safe_question = sanitize_user_input(user_question)
        history_str = " -> ".join(action_history)
        context_str = str(incident_context)
        prompt = MENTOR_USER_PROMPT.format(
            user_question=safe_question,
            incident_context=context_str,
            action_history=history_str,
        )
        return self.call(prompt)
