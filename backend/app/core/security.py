import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import NamedTuple
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import settings

_ITERATIONS = 200_000


class TokenClaims(NamedTuple):
    user_id: UUID
    jti: str
    expires_at: datetime


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    salt_hex, digest_hex = hashed.split("$")
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(digest_hex)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: UUID) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    # jti (JWT ID): a unique id for *this* token, independent of user_id --
    # lets logout revoke exactly this one token (app/db/postgres.py's
    # RevokedToken, checked in app/deps.py's get_current_token) without
    # affecting the user's other active sessions/tokens.
    payload = {"sub": str(user_id), "exp": expires_at, "jti": str(uuid.uuid4())}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenClaims:
    """Returns the token's claims. Raises ValueError if the token is
    missing, malformed, expired, or signed with a different key. Does NOT
    check revocation -- that's app/deps.py's get_current_token, which also
    needs a DB session this function deliberately doesn't take."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") is not None:
            # Reject purpose-scoped tokens (e.g. WS tickets) here -- they
            # must only work through decode_ws_ticket, not as a general
            # bearer token.
            raise ValueError("Not a general-purpose access token")
        return TokenClaims(
            user_id=UUID(payload["sub"]),
            jti=payload["jti"],
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    except (JWTError, KeyError, ValueError) as exc:
        raise ValueError("Invalid or expired access token") from exc


WS_TICKET_EXPIRE_SECONDS = 30


def create_ws_ticket(user_id: UUID) -> str:
    """
    A short-lived, single-purpose token for the incident WebSocket
    handshake. Browsers can't set an Authorization header on a WebSocket
    connection, so the token has to travel some other way -- a query
    param is the standard workaround, but a full-lifetime access token
    (valid for JWT_EXPIRE_MINUTES, a day by default) sitting in a URL is
    needlessly exposed to server access logs and browser history for far
    longer than the few seconds it's actually needed. This ticket expires
    in WS_TICKET_EXPIRE_SECONDS and is rejected by decode_access_token,
    so even if it leaked, it's useless as a general API credential and
    only useful for a few seconds anyway.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=WS_TICKET_EXPIRE_SECONDS)
    payload = {"sub": str(user_id), "exp": expires_at, "purpose": "ws"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_ws_ticket(token: str) -> UUID:
    """Returns the user id embedded in a WS ticket. Raises ValueError if
    missing, malformed, expired, signed with a different key, or not
    actually a WS ticket (e.g. someone passing a normal access token)."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") != "ws":
            raise ValueError("Not a WS ticket")
        return UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise ValueError("Invalid or expired WS ticket") from exc
