from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_JWT_SECRET_KEY = "insecure-dev-secret-change-me-in-.env"


class Settings(BaseSettings):
    database_url: str = "postgresql://user:pass@localhost:5432/iris"
    mongodb_url: str = "mongodb://localhost:27017/iris"
    mongodb_db_name: str = "iris"
    # Comma-separated list of allowed frontend origins for CORS. Defaults to
    # the local Vite dev server so local dev keeps working out of the box;
    # override via env var for any other deployment.
    cors_allowed_origins: str = "http://localhost:5173"
    # Signs/verifies login access tokens (see app/core/security.py). Fixed
    # (not randomly generated per-process) so tokens stay valid across
    # restarts and across multiple uvicorn workers -- MUST be overridden via
    # env var outside local dev, or every deployment shares the same
    # well-known signing key.
    jwt_secret_key: str = DEFAULT_JWT_SECRET_KEY
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


settings = Settings()
