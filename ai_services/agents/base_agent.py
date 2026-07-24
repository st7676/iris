from abc import ABC, abstractmethod
from utils.openai_client import OpenAIClient


class BaseAgent(ABC):
    def __init__(self):
        self.client = OpenAIClient()

    @abstractmethod
    def get_system_prompt(self) -> str:
        pass

    def call(self, user_message: str) -> str:
        system_prompt = self.get_system_prompt()
        return self.client.call(system_prompt, user_message)
