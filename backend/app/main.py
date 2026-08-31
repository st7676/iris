import logging
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import incidents, instructor, scenarios, users
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.core.rate_limit import limiter
from app.core.security import decode_ws_ticket
from app.core.ws_manager import manager
from app.db.init_db import init_db
from app.db.mongodb import incidents_collection
from app.simulation.engine import build_ai_commander_update

configure_logging()
logger = logging.getLogger("iris.websocket")

app = FastAPI(title="Iris Backend API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(scenarios.router)
app.include_router(incidents.router)
app.include_router(instructor.router)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/")
def read_root():
    return {"status": "success", "message": "Iris Backend is running successfully!"}


@app.websocket("/ws/incidents/{incident_id}")
async def incident_websocket(websocket: WebSocket, incident_id: str) -> None:
    # Browsers can't set an Authorization header on a WebSocket handshake,
    # so a token travels as a query param instead (e.g.
    # /ws/incidents/{incident_id}?token=...). Deliberately a short-lived
    # ws-ticket (POST /api/users/ws-ticket), not the normal access token --
    # a day-long-lived credential sitting in a URL is needlessly exposed
    # to server access logs and browser history for far longer than the
    # handshake actually needs it.
    token = websocket.query_params.get("token")
    try:
        current_user_id = decode_ws_ticket(token) if token else None
    except ValueError:
        current_user_id = None
    if current_user_id is None:
        await websocket.close(code=4401)
        return

    incident = await incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        await websocket.close(code=4404)
        return
    if incident.get("user_id") != str(current_user_id):
        await websocket.close(code=4403)
        return

    await manager.connect(incident_id, websocket)
    try:
        while True:
            # Server-initiated updates (e.g. from /investigate) arrive via
            # manager.broadcast() below, not this loop. This loop only
            # handles a client explicitly sending text as a manual trigger
            # (kept for backward compatibility / manual testing).
            last_action = await websocket.receive_text()
            current = await incidents_collection.find_one({"incident_id": incident_id})
            try:
                update = await run_in_threadpool(
                    build_ai_commander_update, current, last_action
                )
            except Exception:
                logger.error(
                    "AI Commander call failed for incident %s", incident_id, exc_info=True
                )
                update = {
                    "type": "event_update",
                    "message": "Unable to fetch a live update right now.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            await websocket.send_json(update)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(incident_id, websocket)
