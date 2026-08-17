"""
Day 17-18 - deterministic end-to-end test of the Insider Threat scenario,
parallel to test_e2e_happy_path.py's Silent Login coverage. Proves the
simulation engine and branching logic are generic across scenarios rather
than hardcoded for Silent Login.
"""


def _register_user(client) -> str:
    response = client.post(
        "/api/users/register",
        json={"username": "insider_soc", "email": "insider@example.com", "password": "StrongPassw0rd!"},
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_full_insider_threat_happy_path(client):
    user_id = _register_user(client)

    # 1. User starts the simulation.
    start = client.post(
        "/api/scenarios/insider_threat_v1/start",
        json={"scenario_id": "insider_threat_v1", "user_id": user_id},
    )
    assert start.status_code == 201
    incident_id = start.json()["incident_id"]
    assert start.json()["severity"] == "medium"

    # 2. User checks file access logs -- the scenario's fast-path evidence,
    #    so severity should fall rather than rise.
    investigate = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "file_access_logs"},
    )
    assert investigate.status_code == 200
    incident_after_investigate = investigate.json()
    assert len(incident_after_investigate["evidence_revealed"]) == 1
    assert (
        incident_after_investigate["evidence_revealed"][0]["evidence_type"]
        == "file_access_logs"
    )
    assert incident_after_investigate["severity"] == "low"

    # 3. User checks usb device logs and HR status.
    client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "usb_device_logs"},
    )
    client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "hr_status"},
    )

    # 4. User makes a decision.
    decide = client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "revoke_access", "notes": "Departing employee, confirmed exfiltration attempt"},
    )
    assert decide.status_code == 200
    assert decide.json()["current_state"] == "decision:revoke_access"

    # 5. User completes the incident -- triggers AI Evaluator (mocked).
    complete = client.post(f"/api/incidents/{incident_id}/complete")
    assert complete.status_code == 200
    report = complete.json()
    assert 0 <= report["score"] <= 100
    assert report["ideal_chain"][0]["action"] == "check_file_access_logs"
    assert report["your_chain"][0]["action"] == "check_file_access_logs"

    # 6. MongoDB: the incident itself reflects the full action log + completed status.
    final_incident = client.get(f"/api/incidents/{incident_id}").json()
    assert final_incident["status"] == "completed"
    assert len(final_incident["action_log"]) == 4
    assert final_incident["action_log"][-1]["action"] == "decide"

    # 7. PostgreSQL: completing the incident recorded a session_scores row,
    #    so the user's history reflects this session.
    history = client.get(f"/api/users/{user_id}/history").json()
    assert history["total_sessions"] == 1
    assert history["sessions"][0]["incident_id"] == incident_id
    assert history["sessions"][0]["scenario_id"] == "insider_threat_v1"
