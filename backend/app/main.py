from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import incidents, scenarios, users
from app.db.init_db import init_db
from app.db.mongodb import incidents_collection
from app.simulation.engine import build_ai_commander_update

app = FastAPI(title="Iris Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(scenarios.router)
app.include_router(incidents.router)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/")
def read_root():
    return {"status": "success", "message": "Iris Backend is running successfully!"}


@app.websocket("/ws/incidents/{incident_id}")
async def incident_websocket(websocket: WebSocket, incident_id: str) -> None:
    incident = await incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        await websocket.close(code=4404)
        return

    await websocket.accept()
    try:
        while True:
            last_action = await websocket.receive_text()
            current = await incidents_collection.find_one({"incident_id": incident_id})
            await websocket.send_json(build_ai_commander_update(current, last_action))
    except WebSocketDisconnect:
        pass
