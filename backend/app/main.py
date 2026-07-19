from fastapi import FastAPI

app = FastAPI(title="Iris Backend API")

@app.get("/")
def read_root():
    return {"status": "success", "message": "Iris Backend is running successfully!"}