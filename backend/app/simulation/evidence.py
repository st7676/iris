from datetime import datetime, timezone
from typing import Any, Dict

_MOCK_EVIDENCE: Dict[str, Any] = {
    "auth_logs": {
        "ip": "203.0.113.42",
        "location": "Bucharest, RO",
        "attempts": 4,
    },
    "email_logs": {
        "sender": "no-reply@corp-alerts.io",
        "subject": "Password reset requested",
        "sent_at": "2026-01-15T10:28:00Z",
    },
    "device_info": {
        "device": "Unknown Windows Device",
        "browser": "Chrome 118",
        "first_seen": True,
    },
    # insider_threat_v1 evidence -- action names coordinated with
    # ai_services' ideal_reasoning_chain (see init_db.py).
    "hr_status": {
        "employee_status": "Offboarded - Last Day",
        "termination_date": "2026-08-01",
        "reason": "Voluntary resignation",
    },
    "file_access_logs": {
        "files_accessed": ["/finance/Q3_projections.xlsx", "/hr/salary_data.csv"],
        "access_time": "23:47",
        "department_match": False,
    },
    "usb_device_logs": {
        "device": "SanDisk USB 3.0 64GB",
        "connected_at": "23:52",
        "data_transferred_mb": 340,
    },
}

_DEFAULT_EVIDENCE = {"note": "No additional data available for this evidence type."}


def get_mock_evidence(evidence_type: str) -> dict:
    data = _MOCK_EVIDENCE.get(evidence_type, _DEFAULT_EVIDENCE)
    return {
        "evidence_type": evidence_type,
        "data": data,
        "revealed_at": datetime.now(timezone.utc),
    }
