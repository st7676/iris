from abc import ABC, abstractmethod

from utils.language import DEFAULT_LANGUAGE, language_instruction
from utils.logger import log_ai_call
from utils.openai_client import OpenAIClient


class BaseAgent(ABC):
    def __init__(self):
        self.client = OpenAIClient()

    @abstractmethod
    def get_system_prompt(self) -> str:
        pass

    def call(self, user_message: str, language: str = DEFAULT_LANGUAGE) -> str:
        system_prompt = self.get_system_prompt() + "\n\n" + language_instruction(language)
        response, usage = self.client.call(system_prompt, user_message)
        log_ai_call(
            self.__class__.__name__,
            system_prompt,
            user_message,
            response,
            usage=usage,
        )
        return response
