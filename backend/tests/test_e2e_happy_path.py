"""
Day 11 - deterministic end-to-end test of the full Silent Login happy path,
using the mocked ai_bridge (see conftest.mock_ai_bridge) so it runs in CI
without hitting OpenAI. Complements test_live_e2e.py, which exercises the
same flow against the real API. Verifies that state lands correctly in both
MongoDB (incident document) and PostgreSQL (session_scores/history).
"""


def _register_user(client) -> tuple[str, dict]:
    response = client.post(
        "/api/users/register",
        json={"username": "sara_soc", "email": "sara@example.com", "password": "StrongPassw0rd!"},
    )
    assert response.status_code == 201
    body = response.json()
    return body["user"]["id"], {"Authorization": f"Bearer {body['access_token']}"}


def test_full_silent_login_happy_path(client):
    user_id, headers = _register_user(client)

    # 1. User starts the simulation.
    start = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
        headers=headers,
    )
    assert start.status_code == 201
    incident_id = start.json()["incident_id"]
    assert start.json()["severity"] == "medium"

    # 2. User checks email logs.
    investigate = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "email_logs"},
        headers=headers,
    )
    assert investigate.status_code == 200

    # 3. The system returns evidence and updates severity per the dynamic
    #    branching logic (email_logs isn't the fast-path auth_logs check, so
    #    severity rises rather than falling).
    incident_after_investigate = investigate.json()
    assert len(incident_after_investigate["evidence_revealed"]) == 1
    assert incident_after_investigate["evidence_revealed"][0]["evidence_type"] == "email_logs"
    assert incident_after_investigate["severity"] == "high"

    # 4. User makes a decision.
    decide = client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead", "notes": "Confirmed phishing + takeover"},
        headers=headers,
    )
    assert decide.status_code == 200
    assert decide.json()["current_state"] == "decision:escalate_to_soc_lead"

    # 5. User completes the incident -- triggers AI Evaluator (mocked).
    complete = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert complete.status_code == 200
    report = complete.json()
    assert 0 <= report["score"] <= 100
    assert report["ideal_chain"][0]["action"] == "check_email_logs"
    assert report["your_chain"][0]["action"] == "check_email_logs"

    # 6. MongoDB: the incident itself reflects the full action log + completed status.
    final_incident = client.get(f"/api/incidents/{incident_id}", headers=headers).json()
    assert final_incident["status"] == "completed"
    assert len(final_incident["action_log"]) == 2
    assert final_incident["action_log"][0]["action"] == "investigate"
    assert final_incident["action_log"][1]["action"] == "decide"

    # 7. PostgreSQL: completing the incident recorded a session_scores row,
    #    so the user's history reflects this session.
    history = client.get(f"/api/users/{user_id}/history", headers=headers).json()
    assert history["total_sessions"] == 1
    assert history["sessions"][0]["incident_id"] == incident_id
    assert history["sessions"][0]["score"] == report["score"]
