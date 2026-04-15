from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://researcher:changeme@db:5432/abduction_research"

    # JWT
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Anthropic (used in Chat 4 ingestion pipeline)
    anthropic_api_key: str = ""

    # File storage
    storage_path: str = "/storage"

    # Runtime
    environment: str = "development"

    model_config = {"env_file": ".env", "case_sensitive": False}


@lru_cache
def get_settings() -> Settings:
    return Settings()
