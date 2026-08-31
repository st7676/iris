import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.core.security import (
    TokenClaims,
    create_access_token,
    create_ws_ticket,
    hash_password,
    verify_password,
)
from app.db.mongodb import ephemeral_users_collection
from app.db.postgres import RevokedToken, SessionScore, User
from app.deps import get_current_token, get_current_user_id, get_db
from app.models.user import TokenResponse, UserCreate, UserLogin, UserResponse

logger = logging.getLogger("iris.users")

router = APIRouter(prefix="/api/users", tags=["users"])


def _issue_token(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
async def register_user(
    request: Request, payload: UserCreate, db: Session = Depends(get_db)
) -> TokenResponse:
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
        return _issue_token(
            User(
                id=ephemeral_id,
                username=payload.username,
                email=payload.email,
                hashed_password="",
                created_at=created_at,
            )
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login_user(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return _issue_token(user)


@router.post("/logout", status_code=204)
def logout_user(claims: TokenClaims = Depends(get_current_token), db: Session = Depends(get_db)) -> None:
    """
    Revokes the caller's current access token (see app/deps.py's
    get_current_token / RevokedToken) so it stops working immediately,
    instead of remaining valid until its natural expiry (up to
    JWT_EXPIRE_MINUTES later). Only this one token is revoked -- other
    active sessions for the same user are unaffected.
    """
    try:
        db.add(RevokedToken(jti=claims.jti, user_id=claims.user_id, expires_at=claims.expires_at))
        db.commit()
    except IntegrityError:
        # Already revoked (e.g. a duplicate logout call) -- that's already
        # the desired end state, not an error.
        db.rollback()
    except SQLAlchemyError:
        db.rollback()
        logger.warning(
            "PostgreSQL unreachable -- could not persist logout revocation for jti=%s; "
            "the token will keep working until it naturally expires.",
            claims.jti,
        )


@router.post("/ws-ticket")
def issue_ws_ticket(current_user_id: UUID = Depends(get_current_user_id)) -> dict:
    """
    Exchanges the caller's normal access token for a short-lived,
    single-purpose ticket for the incident WebSocket handshake (see
    app/core/security.py's create_ws_ticket -- browsers can't set an
    Authorization header on a WebSocket connection, so the token has to
    go in the URL, and a ticket that expires in seconds is far less
    exposed there than a day-long access token would be).
    """
    return {"ws_ticket": create_ws_ticket(current_user_id)}


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
    except SQLAlchemyError:
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
    except SQLAlchemyError:
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
