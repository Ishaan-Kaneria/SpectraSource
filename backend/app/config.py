from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite file by default so a first run needs no database server.
    # docker-compose and production point this at Postgres.
    database_url: str = "sqlite:///./spectra.db"
    cors_origins: str = "http://localhost:5173"
    # Extra origins matched by regex, e.g. Netlify deploy previews.
    cors_origin_regex: str = ""

    # "mock" needs no key and writes sample output from the source, so the app runs end to end offline.
    # "gemini" uses Google Gemini for text, images and video with one key.
    # "openai_compatible" works with OpenAI, Groq, Together, vLLM and Ollama (http://localhost:11434/v1).
    llm_provider: str = "mock"
    # Mock only: pause this long per deliverable so the UI's live progress is visible in demos.
    mock_delay_seconds: float = 0.0
    llm_base_url: str = ""  # empty = the provider's default
    llm_api_key: str = ""
    llm_model: str = ""  # empty = the provider's default
    llm_timeout_seconds: float = 120.0
    # Image input: model that accepts images. Empty means use LLM_MODEL.
    llm_vision_model: str = ""
    # Video/audio input: any OpenAI-compatible /audio/transcriptions endpoint (OpenAI, Groq).
    # Empty base URL or key means reuse the LLM ones.
    transcribe_base_url: str = ""
    transcribe_api_key: str = ""
    transcribe_model: str = "whisper-1"

    max_upload_mb: int = 25
    max_source_chars: int = 60_000

    @field_validator("database_url", mode="before")
    @classmethod
    def _empty_database_url(cls, v: str | None) -> str:
        # `DATABASE_URL=` with nothing after it means "use the default".
        return v or "sqlite:///./spectra.db"

    @field_validator("mock_delay_seconds", mode="before")
    @classmethod
    def _empty_delay(cls, v: str | float | None) -> str | float:
        return v or 0.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
