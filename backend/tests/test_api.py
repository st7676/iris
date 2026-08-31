import asyncio
import uuid

import pytest

USER_ID = "123e4567-e89b-12d3-a456-426614174000"


def _register_user(client) -> tuple[str, dict, str]:
    """Returns (user_id, auth_headers, token) for a freshly registered user."""
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
    body = response.json()
    token = body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return body["user"]["id"], headers, token


def _start_incident(client, scenario_id: str = "silent_login_v1") -> tuple[str, dict, str]:
    """Returns (incident_id, auth_headers, token) for a freshly started incident."""
    user_id, headers, token = _register_user(client)
    response = client.post(
        f"/api/scenarios/{scenario_id}/start",
        json={"scenario_id": scenario_id, "user_id": user_id},
        headers=headers,
    )
    return response.json()["incident_id"], headers, token


def _ws_ticket(client, headers: dict) -> str:
    """The WS handshake takes a short-lived ws-ticket, not the normal
    access token (see app/core/security.py's create_ws_ticket) -- exchange
    one using the caller's Authorization header."""
    response = client.post("/api/users/ws-ticket", headers=headers)
    assert response.status_code == 200
    return response.json()["ws_ticket"]


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


def test_login_success(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"sara_soc_{suffix}"
    client.post(
        "/api/users/register",
        json={
            "username": username,
            "email": f"sara_{suffix}@example.com",
            "password": "StrongPassw0rd!",
        },
    )
    response = client.post(
        "/api/users/login",
        json={"username": username, "password": "StrongPassw0rd!"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == username
    assert "access_token" in body


def test_login_wrong_password(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"sara_soc_{suffix}"
    client.post(
        "/api/users/register",
        json={
            "username": username,
            "email": f"sara_{suffix}@example.com",
            "password": "StrongPassw0rd!",
        },
    )
    response = client.post(
        "/api/users/login",
        json={"username": username, "password": "WrongPassword!"},
    )
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post(
        "/api/users/login",
        json={"username": "does_not_exist", "password": "whatever"},
    )
    assert response.status_code == 401


def test_instructor_dashboard_aggregates_scores(client, postgres_db):
    from app.db.postgres import SessionScore, User

    db = postgres_db()
    user = User(username="instructor_fixture_user", email="ifu@example.com", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add_all(
        [
            SessionScore(user_id=user.id, incident_id="SF-1", scenario_id="silent_login_v1", score=80),
            SessionScore(user_id=user.id, incident_id="SF-2", scenario_id="silent_login_v1", score=60),
            SessionScore(user_id=user.id, incident_id="SF-3", scenario_id="insider_threat_v1", score=90),
        ]
    )
    db.commit()
    db.close()

    # The instructor dashboard requires auth (any logged-in user, not a
    # specific role -- see users.py) but the data itself isn't scoped to
    # the caller, so any authenticated user's token works here.
    _, headers, _ = _register_user(client)
    response = client.get("/api/instructor/dashboard", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_sessions"] == 3
    assert body["average_score"] == 76.67
    assert body["by_scenario"]["silent_login_v1"] == {"sessions": 2, "average_score": 70.0}
    assert body["by_scenario"]["insider_threat_v1"] == {"sessions": 1, "average_score": 90.0}


def test_instructor_dashboard_empty_state(client):
    _, headers, _ = _register_user(client)
    response = client.get("/api/instructor/dashboard", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"total_sessions": 0, "average_score": None, "by_scenario": {}}


def test_instructor_dashboard_requires_auth(client):
    response = client.get("/api/instructor/dashboard")
    assert response.status_code == 401


def test_register_degrades_gracefully_when_postgres_unreachable(client, monkeypatch):
    """
    /register is the very first request the Frontend makes on every "Start
    Simulation" click (see useSimulation.ts) -- if it hard-fails whenever
    Postgres is down, the entire Mongo-backed simulation becomes
    unreachable from the UI even though the simulation itself doesn't
    need Postgres. Demo-critical: this is what happens if Postgres isn't
    up on presentation day.
    """
    from sqlalchemy.exc import OperationalError

    from app.deps import get_db
    from app.main import app

    class _BrokenSession:
        def query(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

        def rollback(self):
            pass

    def _broken_get_db():
        yield _BrokenSession()

    app.dependency_overrides[get_db] = _broken_get_db
    try:
        response = client.post(
            "/api/users/register",
            json={"username": "offline_user", "email": "offline@example.com", "password": "StrongPassw0rd!"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["username"] == "offline_user"
    assert "access_token" in body  # still gets a usable session even without Postgres
    assert "id" in body["user"]  # a real (ephemeral) UUID, so scenario/start etc. still work


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/users/register",
        json={"username": "short_pw_user", "email": "short_pw@example.com", "password": "abc123"},
    )
    assert response.status_code == 422


def test_ephemeral_user_can_start_a_scenario_after_postgres_recovers(client, monkeypatch):
    """
    Regression test: a user registered while Postgres was down (see the
    ephemeral-user fallback above) previously got a UUID that only
    existed in memory -- if Postgres came back up before they clicked
    "Begin Simulation", _user_exists() would do a real (empty) lookup and
    404, breaking the exact flow the fallback exists to keep working.
    Fixed by recording the ephemeral id in Mongo (see
    app.db.mongodb.ephemeral_users_collection) so _user_exists() can
    still recognize it even once Postgres is reachable again.
    """
    from sqlalchemy.exc import OperationalError

    from app.deps import get_db
    from app.main import app

    class _BrokenSession:
        def query(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

        def rollback(self):
            pass

    def _broken_get_db():
        yield _BrokenSession()

    app.dependency_overrides[get_db] = _broken_get_db
    try:
        register_response = client.post(
            "/api/users/register",
            json={"username": "recovering_user", "email": "recovering@example.com", "password": "StrongPassw0rd!"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert register_response.status_code == 201
    register_body = register_response.json()
    ephemeral_user_id = register_body["user"]["id"]
    headers = {"Authorization": f"Bearer {register_body['access_token']}"}

    # Postgres is "back" now (dependency override removed, real -- in this
    # test, SQLite-backed -- session restored by the `client` fixture).
    start_response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": ephemeral_user_id},
        headers=headers,
    )
    assert start_response.status_code == 201


def test_register_is_rate_limited_per_ip(client):
    """
    /register has no CAPTCHA/email verification, so without a rate limit
    it's an open door for account-creation spam or, on /login, a
    brute-force oracle. See app/core/rate_limit.py (5/minute for
    /register). TestClient requests all share one "IP" from slowapi's
    point of view, so 6 rapid registrations from the same client should
    trip the limiter on the 6th.
    """
    for i in range(5):
        response = client.post(
            "/api/users/register",
            json={
                "username": f"rate_limit_user_{i}",
                "email": f"rate_limit_{i}@example.com",
                "password": "StrongPassw0rd!",
            },
        )
        assert response.status_code == 201

    sixth = client.post(
        "/api/users/register",
        json={
            "username": "rate_limit_user_6",
            "email": "rate_limit_6@example.com",
            "password": "StrongPassw0rd!",
        },
    )
    assert sixth.status_code == 429


def test_login_is_rate_limited_per_ip(client):
    """See app/core/rate_limit.py (10/minute for /login) -- guards against
    password brute-forcing a known username."""
    for _ in range(10):
        response = client.post(
            "/api/users/login",
            json={"username": "nonexistent_user", "password": "wrong"},
        )
        assert response.status_code == 401

    eleventh = client.post(
        "/api/users/login",
        json={"username": "nonexistent_user", "password": "wrong"},
    )
    assert eleventh.status_code == 429


def test_logout_revokes_the_token(client):
    """
    Regression test for real token revocation (app/db/postgres.py's
    RevokedToken, checked in app/deps.py's get_current_token): before this,
    logout only cleared the frontend's localStorage -- the token itself
    stayed valid server-side until it naturally expired (up to a day).
    """
    user_id, headers, _ = _register_user(client)

    still_valid = client.get(f"/api/users/{user_id}", headers=headers)
    assert still_valid.status_code == 200

    logout_response = client.post("/api/users/logout", headers=headers)
    assert logout_response.status_code == 204

    after_logout = client.get(f"/api/users/{user_id}", headers=headers)
    assert after_logout.status_code == 401


def test_logout_only_revokes_the_one_token_not_the_whole_user(client):
    """A second login for the same user should be unaffected by logging
    out of the first session -- logout revokes one token (by jti), not
    every token ever issued to that user_id."""
    suffix = uuid.uuid4().hex[:8]
    username = f"multi_session_user_{suffix}"
    register_response = client.post(
        "/api/users/register",
        json={"username": username, "email": f"{username}@example.com", "password": "StrongPassw0rd!"},
    )
    assert register_response.status_code == 201
    user_id = register_response.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {register_response.json()['access_token']}"}

    login_response = client.post(
        "/api/users/login", json={"username": username, "password": "StrongPassw0rd!"}
    )
    assert login_response.status_code == 200
    headers_b = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    logout_response = client.post("/api/users/logout", headers=headers_a)
    assert logout_response.status_code == 204

    assert client.get(f"/api/users/{user_id}", headers=headers_a).status_code == 401
    assert client.get(f"/api/users/{user_id}", headers=headers_b).status_code == 200


def test_start_scenario(client):
    user_id, headers, _ = _register_user(client)
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
        headers=headers,
    )
    assert response.status_code == 201
    assert "incident_id" in response.json()
    assert response.json()["severity"] == "medium"


def test_start_scenario_requires_auth(client):
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": USER_ID},
    )
    assert response.status_code == 401  # missing bearer token


def test_start_scenario_rejects_mismatched_user_id(client):
    _, headers, _ = _register_user(client)
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": USER_ID},
        headers=headers,
    )
    assert response.status_code == 403  # token's user doesn't match the body's user_id


def test_start_scenario_unregistered_user_not_found(client, monkeypatch):
    # A validly-signed token for a user_id that was never registered.
    from uuid import UUID

    from app.core.security import create_access_token

    unregistered_id = UUID(USER_ID)
    token = create_access_token(unregistered_id)
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": USER_ID},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_start_scenario_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.post(
        "/api/scenarios/does_not_exist/start",
        json={"scenario_id": "does_not_exist", "user_id": USER_ID},
        headers=headers,
    )
    # user_id/token mismatch is checked before the scenario lookup.
    assert response.status_code == 403


def test_start_scenario_id_mismatch(client):
    _, headers, _ = _register_user(client)
    response = client.post(
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "other_id", "user_id": USER_ID},
        headers=headers,
    )
    assert response.status_code == 400


def test_get_incident(client):
    incident_id, headers, _ = _start_incident(client)
    response = client.get(f"/api/incidents/{incident_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["incident_id"] == incident_id
    assert response.json()["evidence_revealed"] == []


def test_get_incident_requires_auth(client):
    incident_id, _, _ = _start_incident(client)
    response = client.get(f"/api/incidents/{incident_id}")
    assert response.status_code == 401


def test_get_incident_rejects_other_users(client):
    incident_id, _, _ = _start_incident(client)
    _, other_headers, _ = _register_user(client)
    response = client.get(f"/api/incidents/{incident_id}", headers=other_headers)
    assert response.status_code == 403


def test_get_incident_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.get("/api/incidents/DOES-NOT-EXIST", headers=headers)
    assert response.status_code == 404


def test_investigate_quick_auth_logs_lowers_severity(client):
    incident_id, headers, _ = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "auth_logs"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "low"
    assert len(response.json()["evidence_revealed"]) == 1


def test_investigate_wrong_evidence_raises_severity(client):
    incident_id, headers, _ = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "email_logs"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "high"


def test_start_insider_threat_scenario(client):
    user_id, headers, _ = _register_user(client)
    response = client.post(
        "/api/scenarios/insider_threat_v1/start",
        json={"scenario_id": "insider_threat_v1", "user_id": user_id},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["scenario_id"] == "insider_threat_v1"
    assert "חריגה" in response.json()["alert_message"]


def test_investigate_quick_file_access_logs_lowers_severity_for_insider_threat(client):
    """
    insider_threat_v1 has its own "check this first" evidence type
    (file_access_logs, not auth_logs) -- branching_logic must be
    scenario-aware, not hardcoded to Silent Login's vocabulary.
    """
    incident_id, headers, _ = _start_incident(client, scenario_id="insider_threat_v1")
    response = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "file_access_logs"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "low"


def test_investigate_wrong_evidence_raises_severity_for_insider_threat(client):
    incident_id, headers, _ = _start_incident(client, scenario_id="insider_threat_v1")
    response = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "usb_device_logs"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "high"


def test_complete_insider_threat_scenario(client):
    incident_id, headers, _ = _start_incident(client, scenario_id="insider_threat_v1")
    client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "file_access_logs"},
        headers=headers,
    )
    client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "revoke_access"},
        headers=headers,
    )

    response = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["your_chain"] == [
        {"step": 1, "action": "check_file_access_logs"},
        {"step": 2, "action": "revoke_access"},
    ]
    assert body["ideal_chain"][0]["action"] == "check_file_access_logs"


def test_investigate_incident_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/investigate",
        json={"evidence_type": "auth_logs"},
        headers=headers,
    )
    assert response.status_code == 404


def test_decide_updates_state_and_logs_action(client):
    incident_id, headers, _ = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead", "notes": "test"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["current_state"] == "decision:escalate_to_soc_lead"
    assert response.json()["action_log"][-1]["action"] == "decide"


def test_decide_incident_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/decide",
        json={"decision": "escalate_to_soc_lead"},
        headers=headers,
    )
    assert response.status_code == 404


def test_websocket_event_update(client):
    incident_id, headers, _ = _start_incident(client)
    ticket = _ws_ticket(client, headers)
    with client.websocket_connect(f"/ws/incidents/{incident_id}?token={ticket}") as ws:
        ws.send_text("checked email logs")
        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Mock Commander: new evidence detected."
        assert "timestamp" in data


def test_websocket_rejects_missing_token(client):
    incident_id, _, _ = _start_incident(client)
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/incidents/{incident_id}") as ws:
            ws.receive_text()


def test_investigate_broadcasts_commander_update_without_client_prompting(client):
    """
    Per the Dev3 spec (Day 9): /investigate itself should trigger AI
    Commander and push the update live, not require the client to send a
    WebSocket message asking for one.
    """
    incident_id, headers, _ = _start_incident(client)
    ticket = _ws_ticket(client, headers)
    with client.websocket_connect(f"/ws/incidents/{incident_id}?token={ticket}") as ws:
        response = client.post(
            f"/api/incidents/{incident_id}/investigate",
            json={"evidence_type": "auth_logs"},
            headers=headers,
        )
        assert response.status_code == 200

        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Mock Commander: new evidence detected."
        assert "timestamp" in data


def test_decide_broadcasts_commander_update_without_client_prompting(client):
    """
    Mirrors test_investigate_broadcasts_commander_update_without_client_prompting:
    /decide is the other action-taking endpoint, and previously only
    /investigate triggered a Commander update -- deciding (the most
    consequential action in the flow) left the live feed silent.
    """
    incident_id, headers, _ = _start_incident(client)
    ticket = _ws_ticket(client, headers)
    with client.websocket_connect(f"/ws/incidents/{incident_id}?token={ticket}") as ws:
        response = client.post(
            f"/api/incidents/{incident_id}/decide",
            json={"decision": "escalate_to_soc_lead"},
            headers=headers,
        )
        assert response.status_code == 200

        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Mock Commander: new evidence detected."
        assert "timestamp" in data


def test_websocket_rejects_unknown_incident(client):
    _, headers, _ = _register_user(client)
    ticket = _ws_ticket(client, headers)
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/incidents/DOES-NOT-EXIST?token={ticket}") as ws:
            ws.receive_text()


def test_hint_returns_mentor_guidance(client):
    incident_id, headers, _ = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "What should I check next?"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["hint"] == "Mock Mentor: check the auth logs next."


def test_hint_incident_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.post(
        "/api/incidents/DOES-NOT-EXIST/hint", json={"user_question": "help"}, headers=headers
    )
    assert response.status_code == 404


def test_hint_returns_503_when_ai_mentor_fails(client, monkeypatch):
    from app.core import ai_bridge

    incident_id, headers, _ = _start_incident(client)

    def _raise(*args, **kwargs):
        raise TimeoutError("OpenAI request timed out")

    monkeypatch.setattr(ai_bridge.mentor, "provide_hint", _raise)

    response = client.post(
        f"/api/incidents/{incident_id}/hint", json={"user_question": "help"}, headers=headers
    )
    assert response.status_code == 503


def test_hint_response_reports_remaining_count(client):
    from app.simulation.engine import MAX_HINTS_PER_INCIDENT

    incident_id, headers, _ = _start_incident(client)
    response = client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "What should I check next?"},
        headers=headers,
    )
    body = response.json()
    assert body["hints_used"] == 1
    assert body["hints_remaining"] == MAX_HINTS_PER_INCIDENT - 1


def test_hint_is_refused_once_the_limit_is_reached(client):
    from app.simulation.engine import MAX_HINTS_PER_INCIDENT

    incident_id, headers, _ = _start_incident(client)
    for _ in range(MAX_HINTS_PER_INCIDENT):
        response = client.post(
            f"/api/incidents/{incident_id}/hint",
            json={"user_question": "What should I check next?"},
            headers=headers,
        )
        assert response.status_code == 200

    response = client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "one more please"},
        headers=headers,
    )
    assert response.status_code == 429


def test_complete_returns_score_and_marks_incident_completed(client):
    incident_id, headers, _ = _start_incident(client)
    client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "email_logs"},
        headers=headers,
    )
    client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
        headers=headers,
    )

    response = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 75  # mean of mocked 80/70/75
    assert body["categories"]["detection_score"] == 80
    assert body["your_chain"] == [
        {"step": 1, "action": "check_email_logs"},
        {"step": 2, "action": "escalate_to_soc_lead"},
    ]
    assert body["feedback"] == "Mock feedback for testing."

    incident = client.get(f"/api/incidents/{incident_id}", headers=headers).json()
    assert incident["status"] == "completed"

    # The report can be re-fetched afterwards (e.g. on a page refresh),
    # without re-running the AI Evaluator.
    report = client.get(f"/api/incidents/{incident_id}/report", headers=headers)
    assert report.status_code == 200
    assert report.json() == body


def test_complete_deducts_score_for_hints_used(client):
    from app.simulation.engine import HINT_SCORE_PENALTY

    incident_id, headers, _ = _start_incident(client)
    client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "What should I check next?"},
        headers=headers,
    )
    client.post(
        f"/api/incidents/{incident_id}/hint",
        json={"user_question": "Another hint please"},
        headers=headers,
    )

    response = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["hints_used"] == 2
    assert body["hint_penalty"] == 2 * HINT_SCORE_PENALTY
    assert body["score"] == 75 - 2 * HINT_SCORE_PENALTY  # mean of mocked 80/70/75, minus penalty


def _backdate_incident(mongo_db, incident_id: str, seconds_ago: int) -> None:
    """Rewrites an incident's created_at to simulate time having passed,
    without needing the test to actually sleep 10 minutes."""
    from datetime import datetime, timedelta, timezone

    backdated = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)
    asyncio.run(
        mongo_db["incidents"].update_one(
            {"incident_id": incident_id}, {"$set": {"created_at": backdated}}
        )
    )


def test_investigate_after_deadline_forces_critical_severity(client, mongo_db):
    """Past BREACH_DEADLINE_SECONDS, the attacker is treated as having
    finished regardless of what's investigated -- even the scenario's own
    "quick check" evidence (which normally lowers severity) shouldn't
    save it once the deadline has already passed."""
    incident_id, headers, _ = _start_incident(client)
    _backdate_incident(mongo_db, incident_id, seconds_ago=700)

    response = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "auth_logs"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "critical"


def test_decide_after_deadline_forces_critical_severity(client, mongo_db):
    incident_id, headers, _ = _start_incident(client)
    _backdate_incident(mongo_db, incident_id, seconds_ago=700)

    response = client.post(
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["severity"] == "critical"


def test_complete_after_deadline_reports_breach_successful(client, mongo_db):
    """Completing without any further action after the deadline (e.g.
    walking away from the desk scene) must still land on the failure
    outcome -- not just the endpoints the analyst happens to call."""
    incident_id, headers, _ = _start_incident(client)
    _backdate_incident(mongo_db, incident_id, seconds_ago=700)

    response = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["final_severity"] == "critical"
    assert body["outcome"] == "breach_successful"
    assert body["resolved"] is False


def test_complete_within_deadline_reports_contained_outcome(client):
    incident_id, headers, _ = _start_incident(client)
    client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "auth_logs"},
        headers=headers,
    )

    response = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["final_severity"] == "low"
    assert body["outcome"] == "contained"
    assert body["resolved"] is True


def test_complete_incident_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.post("/api/incidents/DOES-NOT-EXIST/complete", headers=headers)
    assert response.status_code == 404


def test_report_incident_not_found(client):
    _, headers, _ = _register_user(client)
    response = client.get("/api/incidents/DOES-NOT-EXIST/report", headers=headers)
    assert response.status_code == 404


def test_report_not_available_before_completion(client):
    incident_id, headers, _ = _start_incident(client)
    response = client.get(f"/api/incidents/{incident_id}/report", headers=headers)
    assert response.status_code == 404


def test_complete_returns_503_when_ai_evaluator_fails(client, monkeypatch):
    from app.core import ai_bridge

    incident_id, headers, _ = _start_incident(client)

    def _raise(*args, **kwargs):
        raise RuntimeError("rate limited")

    monkeypatch.setattr(ai_bridge.evaluator, "evaluate", _raise)

    response = client.post(f"/api/incidents/{incident_id}/complete", headers=headers)
    assert response.status_code == 503

    # The incident itself is untouched -- it's still in progress, not
    # silently marked completed with no score.
    incident = client.get(f"/api/incidents/{incident_id}", headers=headers).json()
    assert incident["status"] == "in_progress"


def test_websocket_sends_fallback_message_when_ai_commander_fails(client, monkeypatch):
    from app.core import ai_bridge

    incident_id, headers, _ = _start_incident(client)
    ticket = _ws_ticket(client, headers)

    def _raise(*args, **kwargs):
        raise TimeoutError("OpenAI request timed out")

    monkeypatch.setattr(ai_bridge.commander, "generate_update", _raise)

    with client.websocket_connect(f"/ws/incidents/{incident_id}?token={ticket}") as ws:
        ws.send_text("checked email logs")
        data = ws.receive_json()
        assert data["type"] == "event_update"
        assert data["message"] == "Unable to fetch a live update right now."


def test_concurrent_investigate_requests_do_not_lose_data(client):
    import concurrent.futures

    incident_id, headers, _ = _start_incident(client)
    evidence_types = ["auth_logs", "email_logs", "device_info"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(evidence_types)) as executor:
        responses = list(
            executor.map(
                lambda evidence_type: client.post(
                    f"/api/incidents/{incident_id}/investigate",
                    json={"evidence_type": evidence_type},
                    headers=headers,
                ),
                evidence_types,
            )
        )

    assert all(r.status_code == 200 for r in responses)

    incident = client.get(f"/api/incidents/{incident_id}", headers=headers).json()
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

    user_id, headers, _ = _register_user(client)

    def _timed(method, path, **kwargs):
        start = time.perf_counter()
        response = method(path, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return response, elapsed_ms

    start_response, elapsed = _timed(
        client.post,
        "/api/scenarios/silent_login_v1/start",
        json={"scenario_id": "silent_login_v1", "user_id": user_id},
        headers=headers,
    )
    assert elapsed < 500
    incident_id = start_response.json()["incident_id"]

    _, elapsed = _timed(client.get, f"/api/incidents/{incident_id}", headers=headers)
    assert elapsed < 500

    _, elapsed = _timed(
        client.post,
        f"/api/incidents/{incident_id}/investigate",
        json={"evidence_type": "auth_logs"},
        headers=headers,
    )
    assert elapsed < 500

    _, elapsed = _timed(
        client.post,
        f"/api/incidents/{incident_id}/decide",
        json={"decision": "escalate_to_soc_lead"},
        headers=headers,
    )
    assert elapsed < 500
