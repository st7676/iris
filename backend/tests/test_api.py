import uuid

import pytest

USER_ID = "123e4567-e89b-12d3-a456-426614174000"


def _register_user(client) -> str:
    suffix = uuid.uuid4().hex[:8]
    response = client.post(
        "/api/users/register",
        json={
            "username": f"sara_soc_{suffix}",
            "email": f"sara_{suffix}@example.com",
            "password": "StrongPassw0rd!",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _start_incident(client) -> str:
    user_id = _register_user(client)
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
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
    user_id = _register_user(client)
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
    )
    assert response.status_code == 201
    assert "incident_id" in response.json()
    assert response.json()["severity"] == "medium"


def test_start_scenario_unregistered_user_not_found(client):
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": USER_ID},
    )
    assert response.status_code == 404


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


def test_decide_incident_not_found(client):
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/decide", json={"decision": "escalate_to_soc_lead"}
    )
    assert response.status_code == 404


def test_websocket_event_update(client):
    incident_id = _start_incident(client)
    with client.websocket_connect(f"/ws/incidents/{incident_id}") as ws:
        ws.send_text("checked email logs")
        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Mock Commander: new evidence detected."
        assert "timestamp" in data


def test_investigate_broadcasts_commander_update_without_client_prompting(client):
    """
    Per the Dev3 spec (Day 9): /investigate itself should trigger AI
    Commander and push the update live, not require the client to send a
    WebSocket message asking for one.
    """
    incident_id = _start_incident(client)
    with client.websocket_connect(f"/ws/incidents/{incident_id}") as ws:
        response = client.post(
            f"/api/incidents/{incident_id}/investigate", json={"evidence_type": "auth_logs"}
        )
        assert response.status_code == 200

        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Mock Commander: new evidence detected."
        assert "timestamp" in data


def test_websocket_rejects_unknown_incident(client):
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/incidents/DOES-NOT-EXIST") as ws:
            ws.receive_text()


def test_hint_returns_mentor_guidance(client):
    incident_id = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "What should I check next?"},
    )
    assert response.status_code == 200
    assert response.json()["hint"] == "Mock Mentor: check the auth logs next."


def test_hint_incident_not_found(client):
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/hint", json={"user_question": "help"}
    )
    assert response.status_code == 404


def test_hint_returns_503_when_ai_mentor_fails(client, monkeypatch):
    from app.core import ai_bridge

    incident_id = _start_incident(client)

    def _raise(*args, **kwargs):
        raise TimeoutError("OpenAI request timed out")

    monkeypatch.setattr(ai_bridge.mentor, "provide_hint", _raise)

    response = client.post(
        f"/api/incidents/{incident_id}/hint", json={"user_question": "help"}
    )
    assert response.status_code == 503


def test_complete_returns_score_and_marks_incident_completed(client):
    incident_id = _start_incident(client)
    client.post(
        f"/api/incidents/{incident_id}/investigate", json={"evidence_type": "email_logs"}
    )
    client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
    )

    response = client.post(f"/api/incidents/{incident_id}/complete")
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 75  # mean of mocked 80/70/75
    assert body["categories"]["detection_score"] == 80
    assert body["your_chain"] == [
        {"step": 1, "action": "check_email_logs"},
        {"step": 2, "action": "escalate_to_soc_lead"},
    ]
    assert body["feedback"] == "Mock feedback for testing."

    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert incident["status"] == "completed"

    # The report can be re-fetched afterwards (e.g. on a page refresh),
    # without re-running the AI Evaluator.
    report = client.get(f"/api/incidents/{incident_id}/report")
    assert report.status_code == 200
    assert report.json() == body


def test_complete_incident_not_found(client):
    response = client.post("/api/incidents/DOES-NOT-EXIST/complete")
    assert response.status_code == 404


def test_report_incident_not_found(client):
    response = client.get("/api/incidents/DOES-NOT-EXIST/report")
    assert response.status_code == 404


def test_report_not_available_before_completion(client):
    incident_id = _start_incident(client)
    response = client.get(f"/api/incidents/{incident_id}/report")
    assert response.status_code == 404


def test_complete_returns_503_when_ai_evaluator_fails(client, monkeypatch):
    from app.core import ai_bridge

    incident_id = _start_incident(client)

    def _raise(*args, **kwargs):
        raise RuntimeError("rate limited")

    monkeypatch.setattr(ai_bridge.evaluator, "evaluate", _raise)

    response = client.post(f"/api/incidents/{incident_id}/complete")
    assert response.status_code == 503

    # The incident itself is untouched -- it's still in progress, not
    # silently marked completed with no score.
    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert incident["status"] == "in_progress"


def test_websocket_sends_fallback_message_when_ai_commander_fails(client, monkeypatch):
    from app.core import ai_bridge

    incident_id = _start_incident(client)

    def _raise(*args, **kwargs):
        raise TimeoutError("OpenAI request timed out")

    monkeypatch.setattr(ai_bridge.commander, "generate_update", _raise)

    with client.websocket_connect(f"/ws/incidents/{incident_id}") as ws:
        ws.send_text("checked email logs")
        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Unable to fetch a live update right now."


def test_concurrent_investigate_requests_do_not_lose_data(client):
    import concurrent.futures

    incident_id = _start_incident(client)
    evidence_types = ["auth_logs", "email_logs", "device_info"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(evidence_types)) as executor:
        responses = list(
            executor.map(
                lambda evidence_type: client.post(
                    f"/api/incidents/{incident_id}/investigate",
                    json={"evidence_type": evidence_type},
                ),
                evidence_types,
            )
        )

    assert all(r.status_code == 200 for r in responses)

    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert len(incident["action_log"]) == len(evidence_types)
    assert len(incident["evidence_revealed"]) == len(evidence_types)


def test_non_ai_endpoints_respond_quickly(client):
    """
    Day 13 perf check. This can't measure real network latency (no live
    Mongo/Postgres in this environment -- see backend/README.md's
    Performance section), but it does catch gross regressions like an
    accidental blocking call or O(n^2) loop on the request path.
    """
    import time

    user_id = _register_user(client)

    def _timed(method, path, **kwargs):
        start = time.perf_counter()
        response = method(path, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return response, elapsed_ms

    start_response, elapsed = _timed(
        client.post,
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
    )
    assert elapsed < 500
    incident_id = start_response.json()["incident_id"]

    _, elapsed = _timed(client.get, f"/api/incidents/{incident_id}")
    assert elapsed < 500

    _, elapsed = _timed(
        client.post,
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "auth_logs"},
    )
    assert elapsed < 500

    _, elapsed = _timed(
        client.post,
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
    )
    assert elapsed < 500
