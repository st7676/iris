import asyncio
import logging

from sqlalchemy.exc import OperationalError

from app.db.mongodb import incidents_collection, scenarios_collection
from app.db.postgres import Base, ScenarioMetadata, SessionLocal, engine

logger = logging.getLogger("iris.init_db")

SILENT_LOGIN_SCENARIO = {
    "scenario_id": "silent_login_v1",
    "title": "Silent Login",
    "description": "A user reports unusual login activity on their account.",
    "initial_severity": "medium",
    "initial_alert_message": "Unusual login activity detected.",
    "ideal_reasoning_chain": [
        {
            "step": 1,
            "action": "check_email_logs",
            "rationale": "זיהוי וקטור הכניסה הראשוני",
        },
        {
            "step": 2,
            "action": "check_auth_logs",
            "rationale": "אימות מקור ותדירות ניסיונות ההתחברות",
        },
        {
            "step": 3,
            "action": "escalate_to_soc_lead",
            "rationale": "החלטה על הסלמה בהתאם לחומרת הממצאים",
        },
    ],
}

# Action names coordinated ahead of time with the AI prompts
# (ai_services/tests/test_insider_threat.py) so the Evaluator's
# ideal_reasoning_chain comparison is meaningful from day one.
INSIDER_THREAT_SCENARIO = {
    "scenario_id": "insider_threat_v1",
    "title": "Insider Threat",
    "description": "A departing employee accessed sensitive files outside business hours.",
    "initial_severity": "medium",
    "initial_alert_message": "Departing employee accessed sensitive files outside business hours.",
    "ideal_reasoning_chain": [
        {
            "step": 1,
            "action": "check_hr_status",
            "rationale": "Confirm offboarding status first",
        },
        {
            "step": 2,
            "action": "check_file_access_logs",
            "rationale": "Identify what was accessed",
        },
        {
            "step": 3,
            "action": "check_usb_device_logs",
            "rationale": "Check for data exfiltration via USB",
        },
        {
            "step": 4,
            "action": "revoke_access",
            "rationale": "Contain by revoking access immediately",
        },
    ],
}

SCENARIOS = [SILENT_LOGIN_SCENARIO, INSIDER_THREAT_SCENARIO]


def create_postgres_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_postgres() -> None:
    db = SessionLocal()
    try:
        for scenario in SCENARIOS:
            exists = db.get(ScenarioMetadata, scenario["scenario_id"])
            if not exists:
                db.add(
                    ScenarioMetadata(
                        scenario_id=scenario["scenario_id"],
                        title=scenario["title"],
                        difficulty="medium",
                        times_played=0,
                    )
                )
        db.commit()
    finally:
        db.close()


async def seed_mongo() -> None:
    for scenario in SCENARIOS:
        existing = await scenarios_collection.find_one(
            {"scenario_id": scenario["scenario_id"]}
        )
        if not existing:
            await scenarios_collection.insert_one(dict(scenario))


async def create_mongo_indexes() -> None:
    # Every incident/scenario lookup is a find_one on this field (see
    # incidents.py, scenarios.py) -- without an index each one is a full
    # collection scan.
    await incidents_collection.create_index("incident_id", unique=True)
    await scenarios_collection.create_index("scenario_id", unique=True)


async def init_db() -> None:
    # Postgres holds users/session_scores -- not needed for the core AI
    # simulation flow (incidents/investigate/hint/complete all live in
    # Mongo). Don't hard-crash the whole app if it's unreachable (e.g.
    # running locally without Docker, with only Mongo installed) --
    # just warn loudly so it's obvious Postgres-backed features won't work.
    try:
        create_postgres_tables()
        seed_postgres()
    except OperationalError:
        logger.warning(
            "PostgreSQL is unreachable at startup -- continuing without it. "
            "Mongo-backed features (incidents, investigate, hint, complete) "
            "will work; users/session_scores will not until Postgres is available."
        )
    await seed_mongo()
    await create_mongo_indexes()


if __name__ == "__main__":
    asyncio.run(init_db())
