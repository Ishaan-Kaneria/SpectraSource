from typing import Any, Protocol


class LLMError(RuntimeError):
    pass


class LLMProvider(Protocol):
    name: str

    def generate_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        """Return a JSON object that should conform to `schema`. Callers validate it."""
        ...

    def describe_image(self, data: bytes, mime: str) -> str:
        """Transcribe any text in the image and describe what it shows."""
        ...

    def transcribe(self, data: bytes, filename: str) -> str:
        """Speech-to-text for an audio or video file."""
        ...
