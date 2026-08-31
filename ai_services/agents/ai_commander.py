from agents.base_agent import BaseAgent
from prompts.commander import COMMANDER_SYSTEM_PROMPT, COMMANDER_USER_PROMPT
from utils.guardrails import sanitize_user_input


class AICommander(BaseAgent):
    def get_system_prompt(self) -> str:
        return COMMANDER_SYSTEM_PROMPT

    def generate_update(self, incident_context: dict, last_action: str, language: str = "en") -> str:
        """Generate next incident update."""
        # last_action ultimately comes from the client-supplied
        # evidence_type on /investigate (InvestigateRequest.evidence_type
        # is a free-form str, no allow-list) -- same injection surface as
        # the Mentor's user_question, so it gets the same filtering.
        safe_last_action = sanitize_user_input(last_action)
        context_str = str(incident_context)
        prompt = COMMANDER_USER_PROMPT.format(
            incident_context=context_str,
            last_action=safe_last_action,
            severity=incident_context.get("severity", "UNKNOWN"),
        )
        return self.call(prompt, language=language)
