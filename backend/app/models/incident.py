from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.schemas import IncidentStatus, Severity


class EvidenceItem(BaseModel):
    evidence_type: str
    data: Any
    revealed_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "evidence_type": "auth_logs",
                "data": {"ip": "203.0.113.42", "location": "Bucharest, RO", "attempts": 4},
                "revealed_at": "2026-01-15T10:31:12Z",
            }
        }
    )


class ActionLogEntry(BaseModel):
    action: str
    payload: Optional[dict] = None
    timestamp: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action": "investigate",
                "payload": {"evidence_type": "auth_logs"},
                "timestamp": "2026-01-15T10:31:00Z",
            }
        }
    )


class IncidentCreate(BaseModel):
    scenario_id: str
    user_id: UUID

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scenario_id": "silent_login_v1",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
            }
        }
    )


class IncidentStart(BaseModel):
    incident_id: str
    scenario_id: str
    status: IncidentStatus
    severity: Severity
    alert_message: str
    timestamp: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "incident_id": "SF-2026-0142",
                "scenario_id": "silent_login_v1",
                "status": "in_progress",
                "severity": "medium",
                "alert_message": "Unusual login activity detected.",
                "timestamp": "2026-01-15T10:30:00Z",
            }
        }
    )


class IncidentResponse(BaseModel):
    incident_id: str
    scenario_id: str
    user_id: UUID
    status: IncidentStatus
    severity: Severity
    current_state: str
    evidence_revealed: List[EvidenceItem] = []
    action_log: List[ActionLogEntry] = []

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "incident_id": "SF-2026-0142",
                "scenario_id": "silent_login_v1",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "in_progress",
                "severity": "high",
                "current_state": "awaiting_decision",
                "evidence_revealed": [
                    {
                        "evidence_type": "auth_logs",
                        "data": {"ip": "203.0.113.42", "location": "Bucharest, RO", "attempts": 4},
                        "revealed_at": "2026-01-15T10:31:12Z",
                    }
                ],
                "action_log": [
                    {
                        "action": "investigate",
                        "payload": {"evidence_type": "auth_logs"},
                        "timestamp": "2026-01-15T10:31:00Z",
                    }
                ],
            }
        }
    )


class IncidentInDB(IncidentResponse):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                **IncidentResponse.model_config["json_schema_extra"]["example"],
                "created_at": "2026-01-15T10:30:00Z",
                "updated_at": "2026-01-15T10:31:12Z",
            }
        }
    )


class InvestigateRequest(BaseModel):
    evidence_type: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"evidence_type": "auth_logs"}}
    )


class DecideRequest(BaseModel):
    decision: str
    notes: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "decision": "escalate_to_soc_lead",
                "notes": "Multiple failed logins from an unrecognized location.",
            }
        }
    )


class ScoreResponse(BaseModel):
    score: int
    categories: dict
    ideal_chain: List[dict]
    your_chain: List[dict]
    feedback: Optional[str] = None
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    # A narrative outcome computed from final_severity, independent of the
    # numeric score -- see complete_incident's outcome comment. resolved is
    # a convenience bool for the frontend so it doesn't need to know the
    # outcome string values to branch its win/lose screen.
    final_severity: Severity = Severity.medium
    outcome: str = "contained_with_damage"
    resolved: bool = True

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "score": 89,
                "categories": {
                    "detection_score": 95,
                    "decision_score": 85,
                    "response_score": 90,
                },
                "ideal_chain": [{"step": 1, "action": "check_email_logs"}],
                "your_chain": [{"step": 1, "action": "check_auth_logs"}],
                "feedback": "Strong triage instincts, but the entry vector was confirmed late.",
                "strengths": "Fast password reset after confirming compromise.",
                "improvements": "Check email logs before file access next time.",
                "final_severity": "low",
                "outcome": "contained",
                "resolved": True,
            }
        }
    )


class HintRequest(BaseModel):
    user_question: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"user_question": "What should I check next?"}}
    )
