from fastapi import APIRouter, HTTPException

from app.db.mongodb import incidents_collection, scenarios_collection
from app.models.incident import IncidentCreate, IncidentStart
from app.simulation.engine import build_incident_document

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.post("/{scenario_id}/start", response_model=IncidentStart, status_code=201)
async def start_scenario(scenario_id: str, payload: IncidentCreate) -> dict:
    if payload.scenario_id != scenario_id:
        raise HTTPException(
            status_code=400, detail="scenario_id in body must match the URL"
        )

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
