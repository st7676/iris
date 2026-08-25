from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.postgres import SessionScore
from app.deps import get_current_user_id, get_db

router = APIRouter(prefix="/api/instructor", tags=["instructor"])


@router.get("/dashboard")
def get_instructor_dashboard(
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    scores = db.query(SessionScore).all()

    if not scores:
        return {
            "total_sessions": 0,
            "average_score": None,
            "by_scenario": {},
        }

    scenario_breakdown = {}
    for score in scores:
        scenario_id = score.scenario_id
        if scenario_id not in scenario_breakdown:
            scenario_breakdown[scenario_id] = {"count": 0, "total": 0, "average": 0}
        scenario_breakdown[scenario_id]["count"] += 1
        scenario_breakdown[scenario_id]["total"] += score.score

    for scenario_id in scenario_breakdown:
        count = scenario_breakdown[scenario_id]["count"]
        total = scenario_breakdown[scenario_id]["total"]
        scenario_breakdown[scenario_id]["average"] = round(total / count, 2)

    total_sessions = len(scores)
    average_score = round(sum(s.score for s in scores) / len(scores), 2) if scores else None

    return {
        "total_sessions": total_sessions,
        "average_score": average_score,
        "by_scenario": scenario_breakdown,
    }
