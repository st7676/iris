import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.postgres import SessionScore, User
from app.deps import get_current_user_id, get_db
from app.models.user import TokenResponse, UserCreate, UserLogin, UserResponse

logger = logging.getLogger("iris.users")

router = APIRouter(prefix="/api/users", tags=["users"])


def _issue_token(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        existing = (
            db.query(User)
            .filter((User.username == payload.username) | (User.email == payload.email))
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Username or email already registered")

        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=hash_password(payload.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _issue_token(user)
    except IntegrityError:
        # Two concurrent registrations can both pass the existence check
        # above and race to commit -- the loser hits the DB's unique
        # constraint instead of the app-level check.
        db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already registered")
    except OperationalError:
        # Registration is the very first thing the Frontend does on every
        # "Start Simulation" click (see useSimulation.ts) -- if this hard
        # fails whenever Postgres isn't up, the entire Mongo-backed
        # simulation is unreachable from the UI even though it doesn't
        # actually need Postgres. Matches the same graceful-degradation
        # pattern already used in scenarios.py (_user_exists) and
        # incidents.py (/complete's session_scores write): don't persist
        # a real row, but let the user through with an ephemeral id so
        # the rest of the flow works. History/session_scores won't be
        # available for this user until Postgres is back.
        db.rollback()
        logger.warning(
            "PostgreSQL unreachable -- creating an ephemeral (non-persisted) "
            "user for %s so the Mongo-backed simulation flow can still proceed.",
            payload.username,
        )
        return _issue_token(
            User(
                id=uuid.uuid4(),
                username=payload.username,
                email=payload.email,
                hashed_password="",
                created_at=datetime.now(timezone.utc),
            )
        )


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return _issue_token(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> User:
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user")
    try:
        user = db.get(User, user_id)
    except OperationalError:
        raise HTTPException(
            status_code=503, detail="User data temporarily unavailable (PostgreSQL unreachable)"
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/history")
def get_user_history(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> dict:
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's history")

    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        scores = (
            db.query(SessionScore)
            .filter(SessionScore.user_id == user_id)
            .order_by(SessionScore.completed_at.desc())
            .all()
        )
    except OperationalError:
        # Same graceful-degradation pattern as register_user's ephemeral-user
        # fallback: an ephemeral (non-persisted) user has no real row to look
        # up when Postgres is down -- treat "can't check" as "nothing
        # recorded yet" rather than a hard failure, consistent with how
        # register_user let this same user through in the first place.
        logger.warning(
            "PostgreSQL unreachable -- returning an empty history for %s", user_id
        )
        return {"user_id": str(user_id), "total_sessions": 0, "average_score": None, "sessions": []}

    return {
        "user_id": str(user_id),
        "total_sessions": len(scores),
        "average_score": (
            round(sum(s.score for s in scores) / len(scores), 2) if scores else None
        ),
        "sessions": [
            {
                "incident_id": s.incident_id,
                "scenario_id": s.scenario_id,
                "score": s.score,
                "completed_at": s.completed_at.isoformat(),
            }
            for s in scores
        ],
    }
