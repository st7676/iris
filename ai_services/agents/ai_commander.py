import json

from agents.base_agent import BaseAgent
from prompts.commander import (
    COMMANDER_SCENARIO_VOCABULARY,
    COMMANDER_SYSTEM_PROMPT_TEMPLATE,
    COMMANDER_USER_PROMPT,
)
from utils.guardrails import sanitize_user_input


class AICommander(BaseAgent):
    def get_system_prompt(self, scenario_id: str | None = None) -> str:
        # Only the active scenario's vocabulary is sent -- earlier this
        # constant always embedded every scenario's vocab on every call,
        # wasting tokens on content that could never be relevant to the
        # incident actually being narrated. Unknown/missing scenario_id
        # falls back to listing all of them so the Commander still has
        # *something* to work with instead of an empty line.
        vocabulary = COMMANDER_SCENARIO_VOCABULARY.get(scenario_id)
        if vocabulary is None:
            vocabulary = "\n- ".join(COMMANDER_SCENARIO_VOCABULARY.values())
        return COMMANDER_SYSTEM_PROMPT_TEMPLATE.format(scenario_vocabulary=vocabulary)

    def generate_update(self, incident_context: dict, last_action: str) -> str:
        """Generate next incident update."""
        # last_action ultimately comes from the client-supplied
        # evidence_type on /investigate (InvestigateRequest.evidence_type
        # is a free-form str, no allow-list) -- same injection surface as
        # the Mentor's user_question, so it gets the same filtering.
        safe_last_action = sanitize_user_input(last_action)
        context_str = json.dumps(incident_context, ensure_ascii=False)
        prompt = COMMANDER_USER_PROMPT.format(
            incident_context=context_str,
            last_action=safe_last_action,
            severity=incident_context.get("severity", "UNKNOWN"),
        )
        return self.call(prompt, scenario_id=incident_context.get("scenario_id"))
