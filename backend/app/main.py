from fastapi import FastAPI

from app.api.routes import incidents, scenarios, users
from app.db.init_db import init_db

app = FastAPI(title="Iris Backend API")

app.include_router(users.router)
app.include_router(scenarios.router)
app.include_router(incidents.router)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/")
def read_root():
    return {"status": "success", "message": "Iris Backend is running successfully!"}
