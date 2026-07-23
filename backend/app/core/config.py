from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://user:pass@localhost:5432/iris"
    mongodb_url: str = "mongodb://localhost:27017/iris"
    mongodb_db_name: str = "iris"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
