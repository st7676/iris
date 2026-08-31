from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared instance -- imported both by main.py (to register the exception
# handler / app.state) and by individual routes (to apply @limiter.limit(...)).
# In-memory storage: fine for this single-process deployment, but won't
# share limits across multiple uvicorn workers/replicas if that changes.
#
# `main` independently built a simpler hand-rolled limiter (a single flat
# 10/60s bucket shared by /login and /register) before this branch's
# slowapi-based one existed. Kept this version when merging: per-route
# limits (5/min register, 10/min login) fit each endpoint's actual risk
# profile better than one shared bucket, and slowapi's RateLimitExceeded
# handler gives a standard 429 + Retry-After instead of a hand-rolled one.
limiter = Limiter(key_func=get_remote_address)


def reset_rate_limits() -> None:
    """Test-only hook to clear rate limit state between tests (kept as an
    alias of limiter.reset() for compatibility with call sites written
    against the old hand-rolled limiter's name)."""
    limiter.reset()
