import time
from typing import Any

from app.llm import mock_content


class MockProvider:
    """Offline stand-in that writes plausible sample deliverables from the source text.
    Lets the whole pipeline, UI and tests run without an API key."""

    name = "mock"

    def __init__(self, delay: float = 0.0) -> None:
        self.delay = delay  # seconds per generate_json call, so demos show live progress

    def generate_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        if self.delay > 0:
            time.sleep(self.delay)
        content = mock_content.build(schema.get("title", ""), user)
        if content is None or set(content) != set(schema.get("properties", {})):
            return _fill(schema, schema.get("$defs", {}), "")  # unknown or changed schema
        return content

    def describe_image(self, data: bytes, mime: str) -> str:
        return f"[mock image description: {mime}, {len(data)} bytes]"

    def transcribe(self, data: bytes, filename: str) -> str:
        return f"[mock transcript of {filename}]"


def _fill(schema: dict[str, Any], defs: dict[str, Any], key: str) -> Any:
    """Generic fallback: fill any JSON schema with placeholder values."""
    if "$ref" in schema:
        return _fill(defs[schema["$ref"].split("/")[-1]], defs, key)
    if "anyOf" in schema:
        return _fill(schema["anyOf"][0], defs, key)
    t = schema.get("type")
    if t == "object":
        return {k: _fill(v, defs, k) for k, v in schema.get("properties", {}).items()}
    if t == "array":
        n = max(schema.get("minItems", 0), 2)
        return [_fill(schema.get("items", {}), defs, key) for _ in range(n)]
    if t == "integer":
        return 1
    if t == "number":
        return 1.0
    if t == "boolean":
        return True
    return f"[mock {key or 'text'}]"
