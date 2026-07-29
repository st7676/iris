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


_MOCK_HINT = (
    "Consider checking the authentication logs before assessing the damage "
    "— confirming how the attacker got in comes first."
)


def generate_mock_hint(user_question: str) -> str:
    return _MOCK_HINT


def generate_mock_score() -> int:
    return 75 + secrets.randbelow(21)


def generate_mock_categories() -> dict:
    return {
        "detection": generate_mock_score(),
        "decision_making": generate_mock_score(),
        "response": generate_mock_score(),
    }


def _normalize_action_name(action_entry: dict) -> str:
    action = action_entry["action"]
    payload = action_entry.get("payload") or {}
    if action == "investigate":
        return f"check_{payload.get('evidence_type', '')}"
    if action == "decide":
        return payload.get("decision", "")
    return action


def generate_post_mortem_diff(ideal_chain: list[dict], actual_action_log: list[dict]) -> dict:
    actual_actions = [_normalize_action_name(entry) for entry in actual_action_log]

    matches = []
    misses = []
    out_of_order = []

    for index, step in enumerate(ideal_chain):
        if step["action"] not in actual_actions:
            misses.append(step)
            continue
        if actual_actions.index(step["action"]) == index:
            matches.append(step)
        else:
            out_of_order.append(step)

    return {"matches": matches, "misses": misses, "out_of_order": out_of_order}


def build_ai_commander_update() -> dict:
    return {
        "type": "event_update",
        "message": "New login attempt detected...",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
