from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared instance -- imported both by main.py (to register the exception
# handler / app.state) and by individual routes (to apply @limiter.limit(...)).
# In-memory storage: fine for this single-process deployment, but won't
# share limits across multiple uvicorn workers/replicas if that changes.
limiter = Limiter(key_func=get_remote_address)
