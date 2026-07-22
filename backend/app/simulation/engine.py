import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.models.schemas import IncidentStatus, Severity
from app.simulation.evidence import get_mock_evidence


def generate_incident_id() -> str:
    year = datetime.now(timezone.utc).year
    seq = secrets.randbelow(10000)
    return f"SF-{year}-{seq:04d}"


def build_incident_document(scenario: dict, user_id: UUID) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "incident_id": generate_incident_id(),
        "scenario_id": scenario["scenario_id"],
        "user_id": str(user_id),
        "status": IncidentStatus.in_progress.value,
        "severity": scenario.get("initial_severity", Severity.medium.value),
        "current_state": "awaiting_investigation",
        "alert_message": scenario.get("initial_alert_message", ""),
        "evidence_revealed": [],
        "action_log": [],
        "created_at": now,
        "updated_at": now,
    }


def record_investigation(evidence_type: str) -> tuple[dict, dict]:
    evidence = get_mock_evidence(evidence_type)
    action_entry = {
        "action": "investigate",
        "payload": {"evidence_type": evidence_type},
        "timestamp": evidence["revealed_at"],
    }
    return evidence, action_entry


def record_decision(decision: str, notes: Optional[str] = None) -> tuple[dict, str]:
    now = datetime.now(timezone.utc)
    action_entry = {
        "action": "decide",
        "payload": {"decision": decision, "notes": notes},
        "timestamp": now,
    }
    new_state = f"decision:{decision}"
    return action_entry, new_state
