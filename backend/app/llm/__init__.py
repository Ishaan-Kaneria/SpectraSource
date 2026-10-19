from app.config import get_settings
from app.llm.base import LLMError, LLMProvider
from app.llm.mock import MockProvider
from app.llm.openai_compatible import OpenAICompatibleProvider

__all__ = ["LLMError", "LLMProvider", "get_provider"]


def get_provider() -> LLMProvider:
    s = get_settings()
    if s.llm_provider == "mock":
        return MockProvider()
    if s.llm_provider == "openai_compatible":
        return OpenAICompatibleProvider(
            base_url=s.llm_base_url,
            api_key=s.llm_api_key,
            model=s.llm_model,
            timeout=s.llm_timeout_seconds,
            vision_model=s.llm_vision_model or s.llm_model,
            transcribe_base_url=s.transcribe_base_url or s.llm_base_url,
            transcribe_api_key=s.transcribe_api_key or s.llm_api_key,
            transcribe_model=s.transcribe_model,
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {s.llm_provider!r}")
