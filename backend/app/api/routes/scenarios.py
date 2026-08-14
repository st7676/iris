import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.mongodb import ephemeral_users_collection, incidents_collection, scenarios_collection
from app.db.postgres import User
from app.deps import get_db
from app.models.incident import IncidentCreate, IncidentStart
from app.simulation.engine import build_incident_document

logger = logging.getLogger("iris.scenarios")

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


async def _user_exists(user_id: UUID, db: Session) -> bool:
    try:
        if db.get(User, user_id) is not None:
            return True
    except SQLAlchemyError:
        logger.warning(
            "PostgreSQL unreachable -- skipping user_id validation for %s", user_id
        )
        return True

    # Not found in Postgres -- could be a genuinely invalid id, or a user
    # who registered while Postgres was unreachable (see users.py's
    # /register fallback, which records that case here in Mongo since it
    # couldn't persist to Postgres at the time).
    return await ephemeral_users_collection.find_one({"_id": str(user_id)}) is not None


@router.post("/{scenario_id}/start", response_model=IncidentStart, status_code=201)
async def start_scenario(
    scenario_id: str, payload: IncidentCreate, db: Session = Depends(get_db)
) -> dict:
    if payload.scenario_id != scenario_id:
        raise HTTPException(
            status_code=400, detail="scenario_id in body must match the URL"
        )

    if not await _user_exists(payload.user_id, db):
        raise HTTPException(status_code=404, detail="User not found")

    scenario = await scenarios_collection.find_one({"scenario_id": scenario_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    incident = build_incident_document(scenario, payload.user_id)
    await incidents_collection.insert_one(dict(incident))

    logger.info(
        "incident_id=%s user_id=%s scenario_id=%s action=start_scenario",
        incident["incident_id"],
        payload.user_id,
        scenario_id,
    )

    return {
        "incident_id": incident["incident_id"],
        "scenario_id": incident["scenario_id"],
        "status": incident["status"],
        "severity": incident["severity"],
        "alert_message": incident["alert_message"],
        "timestamp": incident["created_at"],
    }
