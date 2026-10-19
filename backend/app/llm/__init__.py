from app.config import get_settings
from app.llm.base import LLMError, LLMProvider
from app.llm.gemini import GEMINI_DEFAULT_MODEL, GEMINI_OPENAI_BASE_URL, GeminiProvider
from app.llm.mock import MockProvider
from app.llm.openai_compatible import OpenAICompatibleProvider

__all__ = ["LLMError", "LLMProvider", "get_provider"]

OPENAI_BASE_URL = "https://api.openai.com/v1"
OPENAI_DEFAULT_MODEL = "gpt-4o-mini"


def get_provider() -> LLMProvider:
    s = get_settings()
    if s.llm_provider == "mock":
        return MockProvider()
    if s.llm_provider == "gemini":
        model = s.llm_model or GEMINI_DEFAULT_MODEL
        return GeminiProvider(
            api_key=s.llm_api_key,
            model=model,
            base_url=s.llm_base_url or GEMINI_OPENAI_BASE_URL,
            timeout=s.llm_timeout_seconds,
            vision_model=s.llm_vision_model or model,
            transcribe_base_url=s.transcribe_base_url or None,
            transcribe_api_key=s.transcribe_api_key or None,
            transcribe_model=s.transcribe_model,
        )
    if s.llm_provider == "openai_compatible":
        base_url = s.llm_base_url or OPENAI_BASE_URL
        model = s.llm_model or OPENAI_DEFAULT_MODEL
        return OpenAICompatibleProvider(
            base_url=base_url,
            api_key=s.llm_api_key,
            model=model,
            timeout=s.llm_timeout_seconds,
            vision_model=s.llm_vision_model or model,
            transcribe_base_url=s.transcribe_base_url or base_url,
            transcribe_api_key=s.transcribe_api_key or s.llm_api_key,
            transcribe_model=s.transcribe_model,
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {s.llm_provider!r}")
