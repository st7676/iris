import asyncio
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

SILENT_LOGIN_SCENARIO = {
    "scenario_id": "silent_login_v1",
    "title": "Silent Login",
    "initial_severity": "medium",
    "initial_alert_message": "Unusual login activity detected.",
    "ideal_reasoning_chain": [
        {"step": 1, "action": "check_email_logs", "rationale": "Identify the initial attack vector"},
        {"step": 2, "action": "check_auth_logs", "rationale": "Verify how the attacker gained access"},
        {"step": 3, "action": "escalate_to_soc_lead", "rationale": "Escalate given confirmed compromise"},
    ],
}


@pytest.fixture
def mongo_db(monkeypatch):
    import app.db.mongodb as mongodb_module
    import app.main as main_module
    from app.api.routes import incidents, scenarios

    mock_db = AsyncMongoMockClient()["iris_test"]

    monkeypatch.setattr(mongodb_module, "scenarios_collection", mock_db["scenarios"])
    monkeypatch.setattr(mongodb_module, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(mongodb_module, "evidence_collection", mock_db["evidence"])
    monkeypatch.setattr(scenarios, "scenarios_collection", mock_db["scenarios"])
    monkeypatch.setattr(scenarios, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(incidents, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(incidents, "scenarios_collection", mock_db["scenarios"])
    monkeypatch.setattr(main_module, "incidents_collection", mock_db["incidents"])

    asyncio.run(mock_db["scenarios"].insert_one(dict(SILENT_LOGIN_SCENARIO)))
    return mock_db


@pytest.fixture(autouse=True)
def mock_ai_bridge(monkeypatch):
    """
    Stub out the real OpenAI-backed agents for the default test suite, so
    tests run fast, deterministically, and without needing a real
    OPENAI_API_KEY. Live wiring is verified separately (see README) by
    running the server and calling the endpoints for real.
    """
    from app.core import ai_bridge

    monkeypatch.setattr(
        ai_bridge.commander,
        "generate_update",
        lambda incident_context, last_action: "Mock Commander: new evidence detected.",
    )
    monkeypatch.setattr(
        ai_bridge.mentor,
        "provide_hint",
        lambda user_question, incident_context, action_history: "Mock Mentor: check the auth logs next.",
    )
    monkeypatch.setattr(
        ai_bridge.evaluator,
        "evaluate",
        lambda ideal_chain, actual_chain, final_severity: {
            "detection_score": 80,
            "decision_score": 70,
            "response_score": 75,
            "feedback": "Mock feedback for testing.",
            "strengths": "Mock strengths.",
            "improvements": "Mock improvements.",
        },
    )


@pytest.fixture
def client(mongo_db):
    from app.main import app

    return TestClient(app)
