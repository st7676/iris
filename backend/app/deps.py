import logging
from typing import Generator
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import TokenClaims, decode_access_token
from app.db.mongodb import db as mongo_db
from app.db.postgres import RevokedToken, SessionLocal

logger = logging.getLogger("iris.deps")

_bearer_scheme = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mongo_db():
    return mongo_db


def get_current_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> TokenClaims:
    """Extracts and verifies the request's Bearer token, including
    revocation (POST /api/users/logout writes to app.db.postgres.RevokedToken).

    The signature/expiry check itself doesn't need Postgres -- login can
    hand out a token for an ephemeral, non-persisted user when Postgres is
    unreachable (see users.register_user), and this dependency shouldn't
    reintroduce a hard Postgres dependency for that path. The revocation
    check does need Postgres, but fails open (logs and treats the token as
    not-revoked) if it's unreachable, for the same reason -- a Postgres
    blip shouldn't lock every logged-in user out of the app.
    """
    try:
        claims = decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    try:
        revoked = db.get(RevokedToken, claims.jti) is not None
    except SQLAlchemyError:
        logger.warning(
            "PostgreSQL unreachable -- skipping token-revocation check for jti=%s",
            claims.jti,
        )
        revoked = False
    if revoked:
        raise HTTPException(status_code=401, detail="Token has been revoked, please log in again")

    return claims


def get_current_user_id(claims: TokenClaims = Depends(get_current_token)) -> UUID:
    return claims.user_id
