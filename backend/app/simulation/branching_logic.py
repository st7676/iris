from datetime import datetime, timezone

from app.models.schemas import Severity

QUICK_CHECK_THRESHOLD_SECONDS = 60

# Past this many seconds from incident creation, the attacker is treated as
# having finished whatever they came for, regardless of what the analyst
# does next -- there was previously no deadline at all (the on-screen Timer
# just counted up forever), so stalling had no in-story consequence. This
# is deliberately not tunable per-scenario yet: same escape-room-style
# pressure for both scenarios until there's a reason to vary it.
BREACH_DEADLINE_SECONDS = 600  # 10 minutes

_SEVERITY_ORDER = [Severity.low, Severity.medium, Severity.high, Severity.critical]

# The evidence type that, if checked first and quickly, indicates the player
# is following the scenario's ideal reasoning chain. Keyed by scenario_id so
# the branching logic stays generic across scenarios rather than hardcoding
# a single evidence type.
_QUICK_CHECK_EVIDENCE_TYPE = {
    "silent_login_v1": "auth_logs",
    "insider_threat_v1": "file_access_logs",
}


def _to_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _shift_severity(current: str, steps: int) -> str:
    try:
        index = _SEVERITY_ORDER.index(Severity(current))
    except ValueError:
        index = _SEVERITY_ORDER.index(Severity.medium)
    new_index = max(0, min(len(_SEVERITY_ORDER) - 1, index + steps))
    return _SEVERITY_ORDER[new_index].value


def is_breach_deadline_passed(incident_created_at: datetime, now: datetime) -> bool:
    elapsed = (_to_utc_aware(now) - _to_utc_aware(incident_created_at)).total_seconds()
    return elapsed >= BREACH_DEADLINE_SECONDS


def escalate_if_deadline_passed(
    current_severity: str, incident_created_at: datetime, now: datetime
) -> str:
    """Force severity to critical once the breach deadline has passed.

    Irreversible on purpose: once the attacker has "finished," no later
    correct action un-does that, same as a real incident that's already
    happened. Called from every incident-mutating endpoint (investigate,
    decide, complete), not just investigate, so stalling on /decide or
    jumping straight to /complete after the deadline can't dodge it.
    """
    if is_breach_deadline_passed(incident_created_at, now):
        return Severity.critical.value
    return current_severity


def apply_investigation_branch(
    evidence_type: str,
    current_severity: str,
    incident_created_at: datetime,
    checked_at: datetime,
    scenario_id: str,
) -> str:
    if is_breach_deadline_passed(incident_created_at, checked_at):
        return Severity.critical.value

    elapsed = (
        _to_utc_aware(checked_at) - _to_utc_aware(incident_created_at)
    ).total_seconds()
    correct_evidence_type = _QUICK_CHECK_EVIDENCE_TYPE.get(scenario_id, "auth_logs")
    checked_correct_evidence_quickly = (
        evidence_type == correct_evidence_type and elapsed <= QUICK_CHECK_THRESHOLD_SECONDS
    )
    if checked_correct_evidence_quickly:
        return _shift_severity(current_severity, -1)
    return _shift_severity(current_severity, +1)
