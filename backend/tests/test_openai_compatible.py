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
