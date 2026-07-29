from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongodb import incidents_collection
from app.models.incident import CompleteResponse, HintRequest, HintResponse
from app.models.schemas import IncidentStatus
from app.simulation.engine import generate_mock_hint, generate_mock_score

router = APIRouter(prefix="/api/incidents", tags=["ai"])


async def _get_incident_or_404(incident_id: str) -> dict:
    incident = await incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/{incident_id}/hint", response_model=HintResponse)
async def get_hint(incident_id: str, payload: HintRequest) -> dict:
    await _get_incident_or_404(incident_id)
    return {"hint": generate_mock_hint(payload.user_question)}


@router.post("/{incident_id}/complete", response_model=CompleteResponse)
async def complete_incident(incident_id: str) -> dict:
    await _get_incident_or_404(incident_id)

    score = generate_mock_score()
    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "status": IncidentStatus.completed.value,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"incident_id": incident_id, "status": IncidentStatus.completed, "score": score}
