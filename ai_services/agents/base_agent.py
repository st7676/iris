from abc import ABC, abstractmethod

from utils.logger import log_ai_call
from utils.openai_client import OpenAIClient


class BaseAgent(ABC):
    def __init__(self):
        self.client = OpenAIClient()

    @abstractmethod
    def get_system_prompt(self, scenario_id: str | None = None) -> str:
        """scenario_id lets a subclass scope its system prompt to only the
        active scenario's vocabulary instead of sending every scenario's
        vocab on every call. Agents that don't have per-scenario content
        (Mentor, Evaluator) just ignore it."""

    def call(self, user_message: str, scenario_id: str | None = None) -> str:
        system_prompt = self.get_system_prompt(scenario_id)
        response, usage = self.client.call(system_prompt, user_message)
        log_ai_call(
            self.__class__.__name__,
            system_prompt,
            user_message,
            response,
            usage=usage,
        )
        return response
