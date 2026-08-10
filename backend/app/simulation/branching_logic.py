from datetime import datetime, timezone

from app.models.schemas import Severity

QUICK_CHECK_THRESHOLD_SECONDS = 60

_SEVERITY_ORDER = [Severity.low, Severity.medium, Severity.high, Severity.critical]

# The evidence type that, per each scenario's ideal_reasoning_chain
# (see app/db/init_db.py), an analyst should check first -- checking it
# quickly lowers severity, same reward Silent Login already had for
# auth_logs. Keeps branching_logic scenario-aware without hardcoding a
# single scenario's vocabulary.
_QUICK_CHECK_EVIDENCE_BY_SCENARIO = {
    "silent_login_v1": "auth_logs",
    "insider_threat_v1": "hr_status",
}
_DEFAULT_QUICK_CHECK_EVIDENCE = "auth_logs"


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
    scenario_id: str | None = None,
) -> str:
    elapsed = (
        _to_utc_aware(checked_at) - _to_utc_aware(incident_created_at)
    ).total_seconds()
    quick_check_evidence = _QUICK_CHECK_EVIDENCE_BY_SCENARIO.get(
        scenario_id, _DEFAULT_QUICK_CHECK_EVIDENCE
    )
    checked_right_evidence_quickly = (
        evidence_type == quick_check_evidence and elapsed <= QUICK_CHECK_THRESHOLD_SECONDS
    )
    if checked_right_evidence_quickly:
        return _shift_severity(current_severity, -1)
    return _shift_severity(current_severity, +1)
