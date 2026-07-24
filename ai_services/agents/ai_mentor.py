from agents.base_agent import BaseAgent
from prompts.mentor import MENTOR_SYSTEM_PROMPT


class AIMentor(BaseAgent):
    def get_system_prompt(self) -> str:
        return MENTOR_SYSTEM_PROMPT

    def provide_hint(self, user_question: str, incident_context: dict, action_history: list) -> str:
        """Provide a hint to guide the user."""
        history_str = " -> ".join(action_history)
        context_str = str(incident_context)
        prompt = MENTOR_SYSTEM_PROMPT.format(
            user_question=user_question,
            incident_context=context_str,
            action_history=history_str,
        )
        return self.call(prompt)
