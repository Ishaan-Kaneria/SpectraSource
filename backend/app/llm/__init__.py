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
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {s.llm_provider!r}")
