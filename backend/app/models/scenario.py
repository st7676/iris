from typing import List

from pydantic import BaseModel, ConfigDict

from app.models.schemas import Severity


class ReasoningStep(BaseModel):
    step: int
    action: str
    rationale: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "step": 1,
                "action": "check_email_logs",
                "rationale": "זיהוי וקטור הכניסה הראשוני",
            }
        }
    )


class ScenarioBase(BaseModel):
    scenario_id: str
    title: str
    description: str
    initial_severity: Severity
    initial_alert_message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scenario_id": "silent_login_v1",
                "title": "Silent Login",
                "description": "A user reports unusual login activity on their account.",
                "initial_severity": "medium",
                "initial_alert_message": "Unusual login activity detected.",
            }
        }
    )


class ScenarioInDB(ScenarioBase):
    ideal_reasoning_chain: List[ReasoningStep] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scenario_id": "silent_login_v1",
                "title": "Silent Login",
                "description": "A user reports unusual login activity on their account.",
                "initial_severity": "medium",
                "initial_alert_message": "Unusual login activity detected.",
                "ideal_reasoning_chain": [
                    {
                        "step": 1,
                        "action": "check_email_logs",
                        "rationale": "זיהוי וקטור הכניסה הראשוני",
                    }
                ],
            }
        }
    )
