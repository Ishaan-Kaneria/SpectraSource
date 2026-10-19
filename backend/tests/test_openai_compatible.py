import httpx

from app.llm.openai_compatible import OpenAICompatibleProvider


def _provider(handler):
    transport = httpx.MockTransport(handler)
    orig = httpx.post

    def post(url, **kw):
        with httpx.Client(transport=transport) as c:
            return c.post(url, **kw)

    return OpenAICompatibleProvider("https://llm.test/v1", "k", "m", vision_model="vm"), post, orig


def test_describe_image_sends_data_url(monkeypatch):
    seen = {}

    def handler(req: httpx.Request):
        seen["body"] = req.read().decode()
        seen["auth"] = req.headers["authorization"]
        return httpx.Response(200, json={"choices": [{"message": {"content": "A chart"}}]})

    p, post, _ = _provider(handler)
    monkeypatch.setattr(httpx, "post", post)
    assert p.describe_image(b"img", "image/png") == "A chart"
    assert '"model":"vm"' in seen["body"].replace(" ", "")
    assert "data:image/png;base64,aW1n" in seen["body"]
    assert seen["auth"] == "Bearer k"


def test_transcribe_posts_multipart(monkeypatch):
    def handler(req: httpx.Request):
        assert req.url.path.endswith("/audio/transcriptions")
        assert b"whisper-1" in req.read()
        return httpx.Response(200, text="hello world\n")

    p, post, _ = _provider(handler)
    monkeypatch.setattr(httpx, "post", post)
    assert p.transcribe(b"vid", "a.mp4") == "hello world"


def test_generate_json_strips_fences(monkeypatch):
    def handler(req):
        return httpx.Response(200, json={"choices": [{"message": {"content": '```json\n{"a": 1}\n```'}}]})

    p, post, _ = _provider(handler)
    monkeypatch.setattr(httpx, "post", post)
    assert p.generate_json("s", "u", {}) == {"a": 1}


def test_gemini_transcribes_video_natively(monkeypatch):
    from app.llm.gemini import GeminiProvider

    seen = {}

    def handler(req: httpx.Request):
        seen["url"] = str(req.url)
        seen["key"] = req.headers.get("x-goog-api-key")
        seen["body"] = req.read().decode()
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "Speech here"}]}}]})

    _, post, _ = _provider(handler)
    monkeypatch.setattr(httpx, "post", post)
    p = GeminiProvider(api_key="g", model="gemini-x", base_url="https://gem.test/openai")
    assert p.transcribe(b"vid", "clip.mp4") == "Speech here"
    assert seen["url"].endswith("/models/gemini-x:generateContent")
    assert seen["key"] == "g"
    assert '"mime_type": "video/mp4"' in seen["body"] or '"mime_type":"video/mp4"' in seen["body"]


def test_provider_factory_defaults(monkeypatch):
    from app import config
    from app.llm import get_provider
    from app.llm.gemini import GEMINI_DEFAULT_MODEL, GeminiProvider

    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("LLM_API_KEY", "g")
    config.get_settings.cache_clear()
    try:
        p = get_provider()
        assert isinstance(p, GeminiProvider)
        assert p.model == GEMINI_DEFAULT_MODEL
        assert "generativelanguage.googleapis.com" in p.base_url
    finally:
        monkeypatch.setenv("LLM_PROVIDER", "mock")
        config.get_settings.cache_clear()
