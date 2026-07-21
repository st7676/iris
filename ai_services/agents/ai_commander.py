from agents.base_agent import BaseAgent
from prompts.commander import COMMANDER_SYSTEM_PROMPT


class AICommander(BaseAgent):
    def get_system_prompt(self) -> str:
        return COMMANDER_SYSTEM_PROMPT

    def generate_update(self, incident_context: dict, last_action: str) -> str:
        """Generate next incident update."""
        context_str = str(incident_context)
        prompt = COMMANDER_SYSTEM_PROMPT.format(
            incident_context=context_str,
            last_action=last_action,
            severity=incident_context.get("severity", "UNKNOWN"),
        )
        return self.call(prompt)
