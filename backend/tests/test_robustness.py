"""Bad uploads fail with a clear, CORS-visible error, and interrupted jobs always resolve."""

import asyncio
import io
import json

import docx
import pytest
from pypdf import PdfReader, PdfWriter

from app import main, services
from app.config import get_settings
from app.models import Artifact, Job

INTERRUPTED = "Generation was interrupted"
RESTARTED = "Generation was interrupted by a server restart"


def _pdf_with_text(text: str) -> bytes:
    """A minimal one-page PDF that shows `text` (pypdf cannot draw text itself)."""
    stream = b"BT /F1 18 Tf 72 720 Td (" + text.encode() + b") Tj ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = bytearray(b"%PDF-1.4\n"), []
    for i, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
    return bytes(out)


def _encrypt(pdf: bytes, user_password: str, algorithm: str) -> bytes:
    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(pdf)))
    writer.encrypt(user_password=user_password, owner_password="owner-secret", algorithm=algorithm)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _blank_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(612, 792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _empty_docx() -> bytes:
    buf = io.BytesIO()
    docx.Document().save(buf)
    return buf.getvalue()


def _upload(client, name: str, data: bytes, text: str | None = None):
    form = {"output_types": json.dumps(["linkedin"]), **({"text": text} if text else {})}
    origin = get_settings().cors_origin_list[0]
    r = client.post("/api/jobs", data=form, files={"file": (name, data, "application/octet-stream")}, headers={"Origin": origin})
    assert r.headers.get("access-control-allow-origin") == origin  # the browser can read the error
    return r


# ---------- uploads ----------


@pytest.mark.parametrize(
    ("name", "data", "message"),
    [
        ("garbage.pdf", b"not a pdf", "Couldn't read this PDF"),
        ("truncated.pdf", b"%PDF-1.4\n1 0 obj\n<<", "Couldn't read this PDF"),
        ("locked-rc4.pdf", _encrypt(_pdf_with_text("Secret plan"), "secret", "RC4-128"), "password-protected"),
        ("locked-aes.pdf", _encrypt(_pdf_with_text("Secret plan"), "secret", "AES-128"), "password-protected"),
        ("garbage.docx", b"not a zip", "Couldn't read this Word document"),
        ("broken.docx", b"PK\x03\x04garbage", "Couldn't read this Word document"),
        ("blank.pdf", _blank_pdf(), "no text that can be extracted"),
        ("empty.docx", _empty_docx(), "no text to work from"),
    ],
)
def test_unreadable_documents_get_a_clear_415(client, name, data, message):
    r = _upload(client, name, data)
    assert r.status_code == 415, r.text
    assert message in r.json()["detail"]


def test_text_less_pdf_is_rejected_even_with_operator_text(client):
    """Otherwise the job would silently ignore the file and work from the note alone."""
    r = _upload(client, "scan.pdf", _blank_pdf(), text="Please summarise the attached advisory.")
    assert r.status_code == 415 and "scanned image" in r.json()["detail"]


def test_readable_pdfs_still_work(client):
    plain = _pdf_with_text("Example VPN 4.2 advisory")
    # Owner-password-only AES PDFs open in any viewer, so they must open here too (needs cryptography).
    for name, data in (("plain.pdf", plain), ("restricted.pdf", _encrypt(plain, "", "AES-128"))):
        r = _upload(client, name, data)
        assert r.status_code == 202, r.text
        assert r.json()["source_kind"] == "pdf" and "Example VPN 4.2 advisory" in r.json()["source_preview"]


# ---------- interrupted jobs ----------


def _job(status: str, *artifacts: Artifact) -> Job:
    return Job(status=status, source_kind="text", source_text="s", source_hash="h", params={}, artifacts=list(artifacts))


def test_crash_mid_job_fails_unfinished_artifacts(client, fresh_db, monkeypatch):
    calls = []

    def flaky_generate(provider, output_type, source_text, params):
        calls.append(output_type)
        if len(calls) == 2:
            raise RuntimeError("worker died")  # not an LLMError, so it takes the crash path
        return {"text": "ok"}

    monkeypatch.setattr(services, "generate", flaky_generate)
    with fresh_db() as db:
        job = _job("pending", *(Artifact(output_type=t) for t in ("linkedin", "twitter", "advisory")))
        db.add(job)
        db.commit()
    services.run_job(job.id)

    out = client.get(f"/api/jobs/{job.id}").json()
    assert out["status"] == "failed"
    assert [(a["status"], a["error"]) for a in out["artifacts"]] == [
        ("done", None),
        ("failed", INTERRUPTED),
        ("failed", INTERRUPTED),
    ]


def test_recover_interrupted_jobs(fresh_db):
    with fresh_db() as db:
        jobs = [
            _job("running", Artifact(output_type="linkedin", status="done", content={"hook": "h"}, content_hash="c"),
                 Artifact(output_type="twitter", status="running"), Artifact(output_type="advisory")),
            _job("pending", Artifact(output_type="video")),
            _job("done", Artifact(output_type="linkedin", status="done")),
            _job("failed", Artifact(output_type="twitter", status="failed", error="boom")),
        ]  # fmt: skip
        db.add_all(jobs)
        db.commit()

    assert services.recover_interrupted_jobs() == 2
    assert services.recover_interrupted_jobs() == 0  # nothing left to recover

    with fresh_db() as db:
        running, pending, done, failed = (db.get(Job, j.id) for j in jobs)
        assert running.status == pending.status == "failed"
        assert [(a.status, a.error) for a in running.artifacts] == [
            ("done", None),
            ("failed", RESTARTED),
            ("failed", RESTARTED),
        ]
        assert running.artifacts[0].content == {"hook": "h"}  # finished work is kept
        assert [(a.status, a.error) for a in pending.artifacts] == [("failed", RESTARTED)]
        assert done.status == "done" and done.artifacts[0].status == "done"
        assert failed.artifacts[0].error == "boom"


def test_startup_recovers_after_creating_tables(monkeypatch):
    calls = []
    monkeypatch.setattr(main, "init_db", lambda: calls.append("init_db"))
    monkeypatch.setattr(main, "recover_interrupted_jobs", lambda: calls.append("recover") or 0)

    async def start_and_stop() -> None:
        async with main.lifespan(main.app):
            assert calls == ["init_db", "recover"]

    asyncio.run(start_and_stop())
