import asyncio
import logging

from sqlalchemy.exc import OperationalError

from app.db.mongodb import scenarios_collection
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


def create_postgres_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_postgres() -> None:
    db = SessionLocal()
    try:
        exists = db.get(ScenarioMetadata, SILENT_LOGIN_SCENARIO["scenario_id"])
        if not exists:
            db.add(
                ScenarioMetadata(
                    scenario_id=SILENT_LOGIN_SCENARIO["scenario_id"],
                    title=SILENT_LOGIN_SCENARIO["title"],
                    difficulty="medium",
                    times_played=0,
                )
            )
            db.commit()
    finally:
        db.close()


async def seed_mongo() -> None:
    existing = await scenarios_collection.find_one(
        {"scenario_id": SILENT_LOGIN_SCENARIO["scenario_id"]}
    )
    if not existing:
        await scenarios_collection.insert_one(dict(SILENT_LOGIN_SCENARIO))


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


if __name__ == "__main__":
    asyncio.run(init_db())
