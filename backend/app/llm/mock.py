from typing import Any


class MockProvider:
    """Offline stand-in that fills any schema with placeholder values.
    Lets the whole pipeline, UI and tests run without an API key."""

    name = "mock"

    def generate_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        return _fill(schema, schema.get("$defs", {}), "")


def _fill(schema: dict[str, Any], defs: dict[str, Any], key: str) -> Any:
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
