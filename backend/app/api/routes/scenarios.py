import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.mongodb import incidents_collection, scenarios_collection
from app.db.postgres import User
from app.deps import get_db
from app.models.incident import IncidentCreate, IncidentStart
from app.simulation.engine import build_incident_document

logger = logging.getLogger("iris.scenarios")

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def _user_exists(user_id: UUID, db: Session) -> bool:
    try:
        return db.get(User, user_id) is not None
    except OperationalError:
        logger.warning(
            "PostgreSQL unreachable -- skipping user_id validation for %s", user_id
        )
        return True


@router.post("/{scenario_id}/start", response_model=IncidentStart, status_code=201)
async def start_scenario(
    scenario_id: str, payload: IncidentCreate, db: Session = Depends(get_db)
) -> dict:
    if payload.scenario_id != scenario_id:
        raise HTTPException(
            status_code=400, detail="scenario_id in body must match the URL"
        )

    if not _user_exists(payload.user_id, db):
        raise HTTPException(status_code=404, detail="User not found")

    scenario = await scenarios_collection.find_one({"scenario_id": scenario_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    incident = build_incident_document(scenario, payload.user_id)
    await incidents_collection.insert_one(dict(incident))

    return {
        "incident_id": incident["incident_id"],
        "scenario_id": incident["scenario_id"],
        "status": incident["status"],
        "severity": incident["severity"],
        "alert_message": incident["alert_message"],
        "timestamp": incident["created_at"],
    }
