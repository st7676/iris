from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.core.security import hash_password, verify_password
from app.db.postgres import SessionScore, User
from app.deps import get_db
from app.models.user import UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    dependencies=[Depends(rate_limit)],
)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
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


@router.post("/login", response_model=UserResponse, dependencies=[Depends(rate_limit)])
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
