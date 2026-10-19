import io
import json

import docx
from sqlalchemy import update

from app.db import SessionLocal
from app.models import AuditEvent
from app.schemas import OutputType

SOURCE = "CERT-In reports a critical vulnerability in Example VPN 4.2 allowing remote code execution."


def _create(client, types, **kw):
    data = {"output_types": json.dumps(types), "params": json.dumps({"tone": "urgent"}), **kw.pop("data", {})}
    return client.post("/api/jobs", data=data, **kw)


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/").json()["status"] == "running"


def test_all_output_types_generate(client):
    types = [t.value for t in OutputType]
    r = _create(client, types, data={"text": SOURCE})
    assert r.status_code == 202, r.text
    job = client.get(f"/api/jobs/{r.json()['id']}").json()
    assert job["status"] == "done"
    assert {a["output_type"] for a in job["artifacts"]} == set(types)
    for a in job["artifacts"]:
        assert a["status"] == "done", a
        assert len(a["content_hash"]) == 64
    assert job["params"]["tone"] == "urgent"


def test_docx_upload(client):
    d = docx.Document()
    d.add_paragraph(SOURCE)
    buf = io.BytesIO()
    d.save(buf)
    r = _create(
        client,
        ["executive_summary"],
        files={"file": ("brief.docx", buf.getvalue(), "application/octet-stream")},
    )
    assert r.status_code == 202, r.text
    assert r.json()["source_kind"] == "docx"
    assert "Example VPN" in r.json()["source_preview"]


def test_rejects_bad_input(client):
    assert _create(client, [], data={"text": SOURCE}).status_code == 422
    assert _create(client, ["nope"], data={"text": SOURCE}).status_code == 422
    assert _create(client, ["linkedin"]).status_code == 422
    r = _create(client, ["linkedin"], files={"file": ("x.exe", b"MZ", "application/octet-stream")})
    assert r.status_code == 415


def test_image_and_video_inputs(client):
    r = _create(client, ["linkedin"], files={"file": ("poster.png", b"\x89PNG", "image/png")})
    assert r.status_code == 202, r.text
    assert r.json()["source_kind"] == "image"
    assert "mock image description" in r.json()["source_preview"]

    r = _create(client, ["twitter"], files={"file": ("brief.mp4", b"\x00\x00", "video/mp4")})
    assert r.status_code == 202, r.text
    assert r.json()["source_kind"] == "video"
    assert "mock transcript of brief.mp4" in r.json()["source_preview"]


def test_audit_chain_detects_tampering(client):
    _create(client, ["twitter"], data={"text": SOURCE})
    v = client.get("/api/audit/verify").json()
    assert v["valid"] and v["entries"] >= 2

    with SessionLocal() as db:
        first = db.query(AuditEvent).order_by(AuditEvent.id).first()
        db.execute(update(AuditEvent).where(AuditEvent.id == first.id).values(actor="mallory"))
        db.commit()
    v = client.get("/api/audit/verify").json()
    assert not v["valid"] and v["broken_at"] == first.id
