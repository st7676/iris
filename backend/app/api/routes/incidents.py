from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongodb import incidents_collection
from app.models.incident import DecideRequest, IncidentResponse, InvestigateRequest
from app.simulation.engine import record_decision, record_investigation

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


async def _get_incident_or_404(incident_id: str) -> dict:
    incident = await incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str) -> dict:
    return await _get_incident_or_404(incident_id)


@router.post("/{incident_id}/investigate", response_model=IncidentResponse)
async def investigate_incident(incident_id: str, payload: InvestigateRequest) -> dict:
    await _get_incident_or_404(incident_id)

    evidence, action_entry = record_investigation(payload.evidence_type)
    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$push": {"evidence_revealed": evidence, "action_log": action_entry},
            "$set": {"updated_at": evidence["revealed_at"]},
        },
    )
    return await _get_incident_or_404(incident_id)


@router.post("/{incident_id}/decide", response_model=IncidentResponse)
async def decide_incident(incident_id: str, payload: DecideRequest) -> dict:
    await _get_incident_or_404(incident_id)

    action_entry, new_state = record_decision(payload.decision, payload.notes)
    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$push": {"action_log": action_entry},
            "$set": {
                "current_state": new_state,
                "updated_at": datetime.now(timezone.utc),
            },
        },
    )
    return await _get_incident_or_404(incident_id)
