import json
from typing import Any

import httpx

from app.llm.base import LLMError


class OpenAICompatibleProvider:
    """Any server that speaks the OpenAI /chat/completions API: OpenAI, Groq, Together,
    vLLM, or a local Ollama. Swapping providers is a config change, not a code change."""

    name = "openai_compatible"

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 120.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def generate_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        system = (
            f"{system}\n\nRespond with a single JSON object only, no prose or code fences. "
            f"It must match this JSON Schema:\n{json.dumps(schema)}"
        )
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            r = httpx.post(
                f"{self.base_url}/chat/completions", json=body, headers=headers, timeout=self.timeout
            )
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError) as e:
            raise LLMError(f"LLM request failed: {e}") from e
        return _parse_json(text)


def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{") :]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise LLMError("LLM did not return a JSON object")
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as e:
        raise LLMError(f"LLM returned invalid JSON: {e}") from e
