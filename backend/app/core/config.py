from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration sourced from environment variables."""

    project_name: str = "HostelRec API"
    environment: str = "development"

    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/hostelrec"

    auth_token_expire_minutes: int = 60
    auth_algorithm: str = "HS256"
    auth_secret_key: str = "change-me"

    super_secret_phrase: str = "lab3-secret"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Provide cached settings instance."""
    return Settings()


