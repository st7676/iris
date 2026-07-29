import pytest

from app.simulation.engine import generate_post_mortem_diff

USER_ID = "123e4567-e89b-12d3-a456-426614174000"


def _start_incident(client) -> str:
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": USER_ID},
    )
    return response.json()["incident_id"]


def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_openapi_docs_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/scenarios/{scenario_id}/start" in paths
    assert "/api/incidents/{incident_id}" in paths


def test_start_scenario(client):
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": USER_ID},
    )
    assert response.status_code == 201
    assert "incident_id" in response.json()
    assert response.json()["severity"] == "medium"


def test_start_scenario_not_found(client):
    response = client.post(
        "/api/scenarios/does_not_exist/start",
        json={"scenario_id": "does_not_exist", "user_id": USER_ID},
    )
    assert response.status_code == 404


def test_start_scenario_id_mismatch(client):
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "other_id", "user_id": USER_ID},
    )
    assert response.status_code == 400


def test_get_incident(client):
    incident_id = _start_incident(client)
    response = client.get(f"/api/incidents/{incident_id}")
    assert response.status_code == 200
    assert response.json()["incident_id"] == incident_id
    assert response.json()["evidence_revealed"] == []


def test_get_incident_not_found(client):
    response = client.get("/api/incidents/DOES-NOT-EXIST")
    assert response.status_code == 404


def test_investigate_quick_auth_logs_lowers_severity(client):
    incident_id = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/investigate", json={"evidence_type": "auth_logs"}
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "low"
    assert len(response.json()["evidence_revealed"]) == 1


def test_investigate_wrong_evidence_raises_severity(client):
    incident_id = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/investigate", json={"evidence_type": "email_logs"}
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "high"


def test_investigate_incident_not_found(client):
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/investigate", json={"evidence_type": "auth_logs"}
    )
    assert response.status_code == 404


def test_decide_updates_state_and_logs_action(client):
    incident_id = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead", "notes": "test"},
    )
    assert response.status_code == 200
    assert response.json()["current_state"] == "decision:escalate_to_soc_lead"
    assert response.json()["action_log"][-1]["action"] == "decide"


def test_hint_returns_mock_hint(client):
    incident_id = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "What should I check first?"},
    )
    assert response.status_code == 200
    assert response.json()["hint"]


def test_hint_incident_not_found(client):
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/hint", json={"user_question": "help?"}
    )
    assert response.status_code == 404


def test_complete_returns_score_and_marks_completed(client):
    incident_id = _start_incident(client)
    response = client.post(f"/api/incidents/{incident_id}/complete")
    assert response.status_code == 200
    body = response.json()
    assert body["incident_id"] == incident_id
    assert body["status"] == "completed"
    assert 75 <= body["score"] <= 95

    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert incident["status"] == "completed"


def test_complete_incident_not_found(client):
    response = client.post("/api/incidents/DOES-NOT-EXIST/complete")
    assert response.status_code == 404


def test_report_returns_score_and_reasoning_chains(client):
    incident_id = _start_incident(client)
    client.post(
        f"/api/incidents/{incident_id}/investigate", json={"evidence_type": "email_logs"}
    )
    client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
    )

    response = client.get(f"/api/incidents/{incident_id}/report")
    assert response.status_code == 200
    body = response.json()
    assert 75 <= body["score"] <= 95
    assert set(body["categories"]) == {"detection", "decision_making", "response"}
    assert body["ideal_chain"][0]["action"] == "check_email_logs"
    assert body["your_chain"][0]["payload"]["evidence_type"] == "email_logs"


def test_report_incident_not_found(client):
    response = client.get("/api/incidents/DOES-NOT-EXIST/report")
    assert response.status_code == 404


def test_generate_post_mortem_diff():
    ideal_chain = [
        {"step": 1, "action": "check_email_logs"},
        {"step": 2, "action": "check_auth_logs"},
        {"step": 3, "action": "isolate_device"},
    ]
    action_log = [
        {"action": "investigate", "payload": {"evidence_type": "auth_logs"}},
        {"action": "investigate", "payload": {"evidence_type": "email_logs"}},
    ]

    diff = generate_post_mortem_diff(ideal_chain, action_log)

    assert diff["matches"] == []
    assert diff["out_of_order"] == [ideal_chain[0], ideal_chain[1]]
    assert diff["misses"] == [ideal_chain[2]]


def test_websocket_event_update(client):
    incident_id = _start_incident(client)
    with client.websocket_connect(f"/ws/incidents/{incident_id}") as ws:
        ws.send_text("ping")
        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert "timestamp" in data


def test_websocket_rejects_unknown_incident(client):
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/incidents/DOES-NOT-EXIST") as ws:
            ws.receive_text()
