"""
Day 11 - real end-to-end test of the full Silent Login flow, hitting the
actual OpenAI API through every integration point (WebSocket -> Commander,
/hint -> Mentor, /complete -> Evaluator). Requires a real OPENAI_API_KEY in
ai_services/.env. Skipped by default (see pytest.ini); run explicitly with:

    pytest -m live
"""

import pytest

pytestmark = pytest.mark.live


def test_full_silent_login_flow_live(client):
    register = client.post(
        "/api/users/register",
        json={"username": "live_e2e_user", "email": "live_e2e@example.com", "password": "StrongPassw0rd!"},
    )
    assert register.status_code == 201
    register_body = register.json()
    user_id = register_body["user"]["id"]
    token = register_body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    start = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
        headers=headers,
    )
    assert start.status_code == 201
    incident_id = start.json()["incident_id"]

    investigate = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "email_logs"},
        headers=headers,
    )
    assert investigate.status_code == 200

    with client.websocket_connect(f"/ws/incidents/{incident_id}?token={token}") as ws:
        ws.send_text("checked email logs")
        update = ws.receive_json()
    assert update["type"] == "event_update"
    assert len(update["message"]) > 0
    print(f"\n[Commander] {update['message']}")

    hint = client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "What should I check next?"},
        headers=headers,
    )
    assert hint.status_code == 200
    assert len(hint.json()["hint"]) > 0
    print(f"[Mentor] {hint.json()['hint']}")

    decide = client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
        headers=headers,
    )
    assert decide.status_code == 200

    complete = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert complete.status_code == 200
    body = complete.json()
    for key in ("detection_score", "decision_score", "response_score"):
        assert 0 <= body["categories"][key] <= 100
    assert len(body["feedback"]) > 0
    print(f"[Evaluator] score={body['score']} feedback={body['feedback']}")

    final = client.get(f"/api/incidents/{incident_id}", headers=headers)
    assert final.json()["status"] == "completed"
