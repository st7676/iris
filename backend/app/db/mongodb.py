from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(settings.mongodb_url, tz_aware=True)
db = client[settings.mongodb_db_name]

scenarios_collection = db["scenarios"]
incidents_collection = db["incidents"]
evidence_collection = db["evidence"]
# Users registered while Postgres was unreachable (see
# app/api/routes/users.py's /register fallback) -- Mongo is the
# always-available datastore here, so a user_id minted during an outage is
# recorded here instead of nowhere. Lets app/api/routes/scenarios.py's
# _user_exists() recognize that user_id even after Postgres recovers,
# instead of 404ing on a row that was never persisted.
ephemeral_users_collection = db["ephemeral_users"]


async def close_mongo_connection() -> None:
    client.close()
