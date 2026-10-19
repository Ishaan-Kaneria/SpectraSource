from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://spectra:spectra@localhost:5432/spectra"
    cors_origins: str = "http://localhost:5173"

    # "mock" needs no key and returns canned output, so the app runs end to end offline.
    # "openai_compatible" works with OpenAI, Groq, Together, vLLM and Ollama (http://localhost:11434/v1).
    llm_provider: str = "mock"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
