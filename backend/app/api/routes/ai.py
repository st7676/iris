from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongodb import incidents_collection, scenarios_collection
from app.models.incident import CompleteResponse, HintRequest, HintResponse, ScoreResponse
from app.models.schemas import IncidentStatus
from app.simulation.engine import (
    generate_mock_categories,
    generate_mock_hint,
    generate_mock_score,
)

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


@router.get("/{incident_id}/report", response_model=ScoreResponse)
async def get_report(incident_id: str) -> dict:
    incident = await _get_incident_or_404(incident_id)
    scenario = await scenarios_collection.find_one(
        {"scenario_id": incident["scenario_id"]}
    )
    ideal_chain = scenario.get("ideal_reasoning_chain", []) if scenario else []

    return {
        "score": generate_mock_score(),
        "categories": generate_mock_categories(),
        "ideal_chain": ideal_chain,
        "your_chain": incident.get("action_log", []),
    }
