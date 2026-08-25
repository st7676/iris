import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.core import ai_bridge
from app.models.schemas import IncidentStatus, Severity
from app.simulation.evidence import get_mock_evidence

# Only 10,000 possible IDs per calendar year -- collisions become
# non-trivial once a few hundred incidents exist in the same year (birthday
# paradox). scenarios.start_scenario retries with a fresh ID a few times
# on the resulting DuplicateKeyError before giving up.
INCIDENT_ID_COLLISION_RETRIES = 5


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


def build_ai_commander_update(incident: dict, last_action: str) -> dict:
    """Ask AI Commander for the next incident update, given current state."""
    message = ai_bridge.commander.generate_update(
        incident_context={
            "scenario_id": incident.get("scenario_id"),
            "severity": incident.get("severity"),
            "alert_message": incident.get("alert_message"),
        },
        last_action=last_action,
    )
    return {
        "type": "event_update",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def build_actual_chain(action_log: list[dict]) -> list[dict]:
    """
    Translate the incident's raw action_log (investigate/decide events with
    their own payload shape) into the {"step", "action"} shape used by
    scenarios.ideal_reasoning_chain, so AI Evaluator can compare them.
    """
    chain: list[dict] = []
    for entry in action_log:
        payload = entry.get("payload") or {}
        if entry.get("action") == "investigate" and "evidence_type" in payload:
            action_name = f"check_{payload['evidence_type']}"
        elif entry.get("action") == "decide" and "decision" in payload:
            action_name = payload["decision"]
        else:
            action_name = entry.get("action", "unknown")
        chain.append({"step": len(chain) + 1, "action": action_name})
    return chain
