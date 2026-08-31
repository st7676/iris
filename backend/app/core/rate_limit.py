import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared instance -- imported both by main.py (to register the exception
# handler / app.state) and by individual routes (to apply @limiter.limit(...)).
#
# Storage: in-memory by default, which only limits correctly for a single
# process. Multiple uvicorn workers/replicas each keep their own counters,
# so a client can get roughly N * worker_count requests through before any
# one worker's counter trips -- the limit is enforced per-process, not
# globally. Setting REDIS_URL points every worker/replica at one shared
# counter store instead, so the configured limits hold app-wide. Left unset
# (local dev, tests), this falls back to the same in-memory behavior as
# before. in_memory_fallback_enabled means a Redis outage degrades to
# per-process limiting rather than making every request error.
#
# `main` independently built a simpler hand-rolled limiter (a single flat
# 10/60s bucket shared by /login and /register) before this branch's
# slowapi-based one existed. Kept this version when merging: per-route
# limits (5/min register, 10/min login) fit each endpoint's actual risk
# profile better than one shared bucket, and slowapi's RateLimitExceeded
# handler gives a standard 429 + Retry-After instead of a hand-rolled one.
_redis_url = os.getenv("REDIS_URL")
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_redis_url,
    in_memory_fallback_enabled=bool(_redis_url),
)


def reset_rate_limits() -> None:
    """Test-only hook to clear rate limit state between tests (kept as an
    alias of limiter.reset() for compatibility with call sites written
    against the old hand-rolled limiter's name)."""
    limiter.reset()
