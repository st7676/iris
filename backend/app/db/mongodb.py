from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(settings.mongodb_url, tz_aware=True)
db = client[settings.mongodb_db_name]

scenarios_collection = db["scenarios"]
incidents_collection = db["incidents"]
evidence_collection = db["evidence"]


async def close_mongo_connection() -> None:
    client.close()
