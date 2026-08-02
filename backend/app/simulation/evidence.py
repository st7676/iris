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
    "file_access_logs": {
        "files_accessed": ["/finance/q3_projections.xlsx", "/hr/salaries_2026.csv"],
        "accessed_at": "2026-01-15T23:47:00Z",
        "outside_business_hours": True,
    },
    "usb_device_logs": {
        "device": "SanDisk Ultra USB 3.0",
        "connected_at": "2026-01-15T23:52:00Z",
        "bytes_transferred": 214748364,
    },
    "hr_status": {
        "employment_status": "resignation_submitted",
        "last_day": "2026-01-20",
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
