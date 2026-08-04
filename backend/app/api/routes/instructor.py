from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.postgres import SessionScore
from app.deps import get_db

router = APIRouter(prefix="/api/instructor", tags=["instructor"])


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)) -> dict:
    scores = db.query(SessionScore).all()
    by_scenario: dict[str, list[int]] = {}
    for s in scores:
        by_scenario.setdefault(s.scenario_id, []).append(s.score)
    return {
        "total_sessions": len(scores),
        "average_score": (
            round(sum(s.score for s in scores) / len(scores), 2) if scores else None
        ),
        "by_scenario": {
            sid: {"sessions": len(v), "average_score": round(sum(v) / len(v), 2)}
            for sid, v in by_scenario.items()
        },
    }
