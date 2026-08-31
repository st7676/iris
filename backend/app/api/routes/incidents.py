import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core import ai_bridge
from app.core.ws_manager import manager
from app.db.mongodb import incidents_collection, scenarios_collection
from app.db.postgres import SessionScore
from app.deps import get_current_user_id, get_db
from app.models.incident import (
    DecideRequest,
    HintRequest,
    IncidentResponse,
    InvestigateRequest,
    ScoreResponse,
)
from app.simulation.branching_logic import apply_investigation_branch, escalate_if_deadline_passed
from app.simulation.engine import (
    build_actual_chain,
    build_ai_commander_update,
    record_decision,
    record_investigation,
)

logger = logging.getLogger("iris.incidents")

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


async def _get_incident_or_404(incident_id: str, current_user_id: UUID) -> dict:
    incident = await incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.get("user_id") != str(current_user_id):
        raise HTTPException(status_code=403, detail="Not authorized to access this incident")
    return incident


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str, current_user_id: UUID = Depends(get_current_user_id)
) -> dict:
    return await _get_incident_or_404(incident_id, current_user_id)


@router.post("/{incident_id}/investigate", response_model=IncidentResponse)
async def investigate_incident(
    incident_id: str,
    payload: InvestigateRequest,
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    incident = await _get_incident_or_404(incident_id, current_user_id)

    evidence, action_entry = record_investigation(payload.evidence_type)
    new_severity = apply_investigation_branch(
        evidence_type=payload.evidence_type,
        current_severity=incident["severity"],
        incident_created_at=incident["created_at"],
        checked_at=evidence["revealed_at"],
        scenario_id=incident["scenario_id"],
    )

    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$push": {"evidence_revealed": evidence, "action_log": action_entry},
            "$set": {"severity": new_severity, "updated_at": evidence["revealed_at"]},
        },
    )
    updated = await _get_incident_or_404(incident_id, current_user_id)

    # AI Commander announces the development to anyone watching this
    # incident's WebSocket -- this is the "live incident" feel from the
    # Technical Spec, not something the client has to poll/ask for.
    # Runs off the event loop (it's a blocking network call to OpenAI) and
    # is best-effort: a broadcast failure shouldn't fail the investigate
    # request itself, the evidence was already recorded successfully.
    try:
        ai_update = await run_in_threadpool(
            build_ai_commander_update, updated, payload.evidence_type
        )
        await manager.broadcast(incident_id, ai_update)
    except Exception:
        logger.error(
            "AI Commander broadcast failed for incident %s", incident_id, exc_info=True
        )

    logger.info(
        "incident_id=%s user_id=%s action=investigate evidence_type=%s new_severity=%s",
        incident_id,
        incident.get("user_id"),
        payload.evidence_type,
        new_severity,
    )
    return updated


@router.post("/{incident_id}/decide", response_model=IncidentResponse)
async def decide_incident(
    incident_id: str,
    payload: DecideRequest,
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    incident = await _get_incident_or_404(incident_id, current_user_id)

    now = datetime.now(timezone.utc)
    # decide() never recomputed severity at all before this -- only
    # investigate() did (via apply_investigation_branch) -- so stalling
    # here past the breach deadline had no consequence either.
    new_severity = escalate_if_deadline_passed(incident["severity"], incident["created_at"], now)

    action_entry, new_state = record_decision(payload.decision, payload.notes)
    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$push": {"action_log": action_entry},
            "$set": {
                "current_state": new_state,
                "severity": new_severity,
                "updated_at": now,
            },
        },
    )
    logger.info(
        "incident_id=%s user_id=%s action=decide decision=%s",
        incident_id,
        incident.get("user_id"),
        payload.decision,
    )
    return await _get_incident_or_404(incident_id, current_user_id)


@router.post("/{incident_id}/hint")
async def hint_incident(
    incident_id: str,
    payload: HintRequest,
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    incident = await _get_incident_or_404(incident_id, current_user_id)
    action_history = [entry["action"] for entry in incident.get("action_log", [])]

    try:
        hint = await run_in_threadpool(
            ai_bridge.mentor.provide_hint,
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
    logger.info(
        "incident_id=%s user_id=%s action=hint", incident_id, incident.get("user_id")
    )
    return {"hint": hint}


@router.post("/{incident_id}/complete", response_model=ScoreResponse)
async def complete_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    incident = await _get_incident_or_404(incident_id, current_user_id)
    scenario = await scenarios_collection.find_one({"scenario_id": incident["scenario_id"]})
    ideal_chain = (scenario or {}).get("ideal_reasoning_chain", [])
    actual_chain = build_actual_chain(incident.get("action_log", []))

    # Covers completing straight from an idle desk scene with no further
    # investigate/decide call in between -- those endpoints only see the
    # deadline if the analyst actually acts again after it passes.
    final_severity = escalate_if_deadline_passed(
        incident["severity"], incident["created_at"], datetime.now(timezone.utc)
    )

    try:
        result = await run_in_threadpool(
            ai_bridge.evaluator.evaluate,
            ideal_chain=ideal_chain,
            actual_chain=actual_chain,
            final_severity=final_severity,
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

    # A narrative outcome, independent of the numeric score: two analysts
    # can both score 70% and land in very different stories -- one who
    # contained a low-severity incident cleanly, one who let it go
    # critical but still described their (wrong) actions coherently. The
    # score grades *how well you played*; this says *what happened to the
    # company*.
    if final_severity == "critical":
        outcome = "breach_successful"
    elif final_severity == "low":
        outcome = "contained"
    else:
        outcome = "contained_with_damage"
    resolved = outcome != "breach_successful"

    score_doc = {
        "score": overall_score,
        "categories": categories,
        "ideal_chain": ideal_chain,
        "your_chain": actual_chain,
        "feedback": result.get("feedback"),
        "strengths": result.get("strengths"),
        "improvements": result.get("improvements"),
        "final_severity": final_severity,
        "outcome": outcome,
        "resolved": resolved,
    }

    await incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "status": "completed",
                "severity": final_severity,
                "score": score_doc,
                "updated_at": datetime.now(timezone.utc),
            }
        },
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

    logger.info(
        "incident_id=%s user_id=%s action=complete score=%s",
        incident_id,
        incident.get("user_id"),
        overall_score,
    )
    return score_doc


@router.get("/{incident_id}/report", response_model=ScoreResponse)
async def get_report(
    incident_id: str, current_user_id: UUID = Depends(get_current_user_id)
) -> dict:
    incident = await _get_incident_or_404(incident_id, current_user_id)
    score = incident.get("score")
    if not score:
        raise HTTPException(
            status_code=404, detail="Report not available -- complete the incident first"
        )
    return score
