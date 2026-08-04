import asyncio
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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
    from app.db.init_db import INSIDER_THREAT_SCENARIO

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
    asyncio.run(mock_db["scenarios"].insert_one(dict(INSIDER_THREAT_SCENARIO)))
    return mock_db


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from app.core.rate_limit import reset_rate_limits

    reset_rate_limits()
    yield


@pytest.fixture(autouse=True)
def mock_ai_bridge(request, monkeypatch):
    """
    Stub out the real OpenAI-backed agents for the default test suite, so
    tests run fast, deterministically, and without needing a real
    OPENAI_API_KEY. Tests marked `@pytest.mark.live` opt out and hit the
    real OpenAI API (see test_live_e2e.py).
    """
    if request.node.get_closest_marker("live"):
        return

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
def postgres_db():
    """
    Swap the real Postgres-backed session for an in-memory SQLite one, so
    tests can verify session_scores/users writes without a live Postgres
    instance. SQLAlchemy compiles the Postgres-specific UUID column type to
    a portable equivalent on other dialects, so the same models work as-is.
    """
    from app.db.postgres import Base
    from app.deps import get_db
    from app.main import app

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSessionLocal
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client(mongo_db, postgres_db):
    from app.main import app

    return TestClient(app)
