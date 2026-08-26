import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Prefer an explicit DATABASE_URL env var (set by docker-compose); fall
    # back to the docker-compose credentials for local development.
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:secret@localhost:5432/iris"
    )
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/iris")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "iris")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
