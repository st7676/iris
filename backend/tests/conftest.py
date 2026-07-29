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
}


@pytest.fixture
def mongo_db(monkeypatch):
    import app.db.mongodb as mongodb_module
    import app.main as main_module
    from app.api.routes import ai, incidents, scenarios

    mock_db = AsyncMongoMockClient()["iris_test"]

    monkeypatch.setattr(mongodb_module, "scenarios_collection", mock_db["scenarios"])
    monkeypatch.setattr(mongodb_module, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(mongodb_module, "evidence_collection", mock_db["evidence"])
    monkeypatch.setattr(scenarios, "scenarios_collection", mock_db["scenarios"])
    monkeypatch.setattr(scenarios, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(incidents, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(ai, "incidents_collection", mock_db["incidents"])
    monkeypatch.setattr(main_module, "incidents_collection", mock_db["incidents"])

    asyncio.run(mock_db["scenarios"].insert_one(dict(SILENT_LOGIN_SCENARIO)))
    return mock_db


@pytest.fixture
def client(mongo_db):
    from app.main import app

    return TestClient(app)
