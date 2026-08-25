# PEP604 `X | None` unions below need this on Python 3.9 (the README's
# stated minimum for running the backend outside Docker) -- without it,
# `scenario_id: str | None` raises `TypeError` at import time on 3.9;
# `from __future__ import annotations` makes annotations lazy strings so
# the syntax is accepted regardless of runtime Python version.
from __future__ import annotations

from datetime import datetime, timezone

from app.models.schemas import Severity

QUICK_CHECK_THRESHOLD_SECONDS = 60

_SEVERITY_ORDER = [Severity.low, Severity.medium, Severity.high, Severity.critical]

# The evidence type that, when checked quickly, lowers severity for each
# scenario. Ideally this is each scenario's ideal_reasoning_chain[0] (see
# app/db/init_db.py) -- insider_threat_v1's "hr_status" entry follows that
# rule. silent_login_v1's "auth_logs" does NOT: its actual chain starts
# with "check_email_logs". That mismatch predates this dict (the original
# hardcoded check was always `evidence_type == "auth_logs"`) and is kept
# as-is here rather than silently changed, since flipping it would change
# scoring behavior for an already-shipped scenario. Keep this in sync by
# hand when adding a scenario; don't assume it always equals step 1 of the
# ideal_reasoning_chain.
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
