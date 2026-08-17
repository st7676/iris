import time
from collections import defaultdict

from fastapi import HTTPException, Request

_WINDOW_SECONDS = 60
_MAX_REQUESTS = 10

_hits: dict[str, list[float]] = defaultdict(list)


def rate_limit(request: Request) -> None:
    """
    Basic in-memory per-IP rate limit, guarding /login and /register against
    brute-force attempts. Not distributed-safe -- fine for a single backend
    instance, would need a shared store (e.g. Redis) behind a load balancer.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    timestamps = _hits[client_ip]
    timestamps[:] = [t for t in timestamps if now - t < _WINDOW_SECONDS]
    if len(timestamps) >= _MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many requests, try again later")
    timestamps.append(now)


def reset_rate_limits() -> None:
    """Test-only hook to clear rate limit state between tests."""
    _hits.clear()
