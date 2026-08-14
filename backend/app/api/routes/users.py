import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.db.mongodb import ephemeral_users_collection
from app.db.postgres import SessionScore, User
from app.deps import get_db
from app.models.user import UserCreate, UserLogin, UserResponse

logger = logging.getLogger("iris.users")

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
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
        return user
    except IntegrityError:
        # Two concurrent registrations for the same username/email both
        # passed the SELECT above, then one INSERT won and this one lost
        # the unique constraint -- a real duplicate, not an outage.
        db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already registered")
    except SQLAlchemyError:
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
        #
        # The ephemeral id IS recorded in Mongo (always-available here),
        # so scenarios.py's _user_exists() can still recognize it even
        # after Postgres recovers -- otherwise a user registered during a
        # blip would get a confusing 404 on /scenarios/{id}/start the
        # moment Postgres came back up.
        db.rollback()
        logger.warning(
            "PostgreSQL unreachable -- creating an ephemeral (non-persisted) "
            "user for %s so the Mongo-backed simulation flow can still proceed.",
            payload.username,
        )
        ephemeral_id = uuid.uuid4()
        created_at = datetime.now(timezone.utc)
        await ephemeral_users_collection.insert_one(
            {
                "_id": str(ephemeral_id),
                "username": payload.username,
                "email": payload.email,
                "created_at": created_at,
            }
        )
        return User(
            id=ephemeral_id,
            username=payload.username,
            email=payload.email,
            hashed_password="",
            created_at=created_at,
        )


@router.post("/login", response_model=UserResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/history")
def get_user_history(user_id: UUID, db: Session = Depends(get_db)) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    scores = (
        db.query(SessionScore)
        .filter(SessionScore.user_id == user_id)
        .order_by(SessionScore.completed_at.desc())
        .all()
    )
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
