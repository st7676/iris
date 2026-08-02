from datetime import datetime, timezone

from app.models.schemas import Severity

QUICK_CHECK_THRESHOLD_SECONDS = 60

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


def apply_investigation_branch(
    evidence_type: str,
    current_severity: str,
    incident_created_at: datetime,
    checked_at: datetime,
    scenario_id: str,
) -> str:
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
