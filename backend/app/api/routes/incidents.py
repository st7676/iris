import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core import ai_bridge
from app.db.mongodb import incidents_collection, scenarios_collection
from app.db.postgres import SessionScore
from app.deps import get_db
from app.models.incident import (
    DecideRequest,
    HintRequest,
    IncidentResponse,
    InvestigateRequest,
    ScoreResponse,
)
from app.simulation.branching_logic import apply_investigation_branch
from app.simulation.engine import build_actual_chain, record_decision, record_investigation

logger = logging.getLogger("iris.incidents")

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
    incident = await _get_incident_or_404(incident_id)

    evidence, action_entry = record_investigation(payload.evidence_type)
    new_severity = apply_investigation_branch(
        evidence_type=payload.evidence_type,
        current_severity=incident["severity"],
        incident_created_at=incident["created_at"],
        checked_at=evidence["revealed_at"],
    )

    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$push": {"evidence_revealed": evidence, "action_log": action_entry},
            "$set": {"severity": new_severity, "updated_at": evidence["revealed_at"]},
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


@router.post("/{incident_id}/hint")
async def hint_incident(incident_id: str, payload: HintRequest) -> dict:
    incident = await _get_incident_or_404(incident_id)
    action_history = [entry["action"] for entry in incident.get("action_log", [])]

    try:
        hint = ai_bridge.mentor.provide_hint(
            user_question=payload.user_question,
            incident_context={
                "scenario_id": incident.get("scenario_id"),
                "severity": incident.get("severity"),
            },
            action_history=action_history,
        )
    except Exception:
        logger.error("AI Mentor call failed for incident %s", incident_id, exc_info=True)
        raise HTTPException(
            status_code=503, detail="AI Mentor is temporarily unavailable, try again shortly"
        )
    return {"hint": hint}


@router.post("/{incident_id}/complete", response_model=ScoreResponse)
async def complete_incident(incident_id: str, db: Session = Depends(get_db)) -> dict:
    incident = await _get_incident_or_404(incident_id)
    scenario = await scenarios_collection.find_one({"scenario_id": incident["scenario_id"]})
    ideal_chain = (scenario or {}).get("ideal_reasoning_chain", [])
    actual_chain = build_actual_chain(incident.get("action_log", []))

    try:
        result = ai_bridge.evaluator.evaluate(
            ideal_chain=ideal_chain,
            actual_chain=actual_chain,
            final_severity=incident["severity"],
        )
    except Exception:
        logger.error("AI Evaluator call failed for incident %s", incident_id, exc_info=True)
        raise HTTPException(
            status_code=503, detail="AI Evaluator is temporarily unavailable, try again shortly"
        )

    categories = {
        "detection_score": result.get("detection_score", 0),
        "decision_score": result.get("decision_score", 0),
        "response_score": result.get("response_score", 0),
    }
    overall_score = round(sum(categories.values()) / len(categories))

    score_doc = {
        "score": overall_score,
        "categories": categories,
        "ideal_chain": ideal_chain,
        "your_chain": actual_chain,
        "feedback": result.get("feedback"),
        "strengths": result.get("strengths"),
        "improvements": result.get("improvements"),
    }

    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {"$set": {"status": "completed", "score": score_doc, "updated_at": datetime.now(timezone.utc)}},
    )

    try:
        db.add(
            SessionScore(
                user_id=UUID(incident["user_id"]),
                incident_id=incident_id,
                scenario_id=incident["scenario_id"],
                score=overall_score,
            )
        )
        db.commit()
    except SQLAlchemyError:
        logger.warning(
            "Could not record session_scores for incident %s (Postgres unreachable, "
            "or user_id doesn't match a registered user) -- "
            "/api/users/{user_id}/history will miss it.",
            incident_id,
        )
        db.rollback()

    return score_doc
