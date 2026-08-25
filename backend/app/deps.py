from typing import Generator
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.mongodb import db as mongo_db
from app.db.postgres import SessionLocal

_bearer_scheme = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mongo_db():
    return mongo_db


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> UUID:
    """Extracts and verifies the user id from the request's Bearer token.

    Deliberately trusts the JWT's signature alone (no DB lookup) -- login
    can hand out a token for an ephemeral, non-persisted user when Postgres
    is unreachable (see users.register_user), and this dependency shouldn't
    reintroduce a hard Postgres dependency into every protected route.
    """
    try:
        return decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
