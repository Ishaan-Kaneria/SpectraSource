import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import audit
from app.config import get_settings
from app.exporters import EXPORTS, MEDIA, render
from app.db import get_db
from app.ingest import UnsupportedSource, extract
from app.llm import get_provider
from app.models import Artifact, Job
from app.schemas import (
    ArtifactOut,
    ArtifactVerifyOut,
    AuditVerifyOut,
    GenerationParams,
    JobOut,
    JobSummary,
    OutputType,
)
from app.services import run_job

router = APIRouter(prefix="/api")


def _job_out(job: Job) -> JobOut:
    return JobOut(
        id=job.id,
        status=job.status,
        source_kind=job.source_kind,
        source_name=job.source_name,
        source_preview=job.source_text[:500],
        params=GenerationParams(**job.params),
        created_at=job.created_at,
        artifacts=[
            ArtifactOut(
                id=a.id,
                output_type=a.output_type,
                status=a.status,
                content=a.content,
                error=a.error,
                content_hash=a.content_hash,
                export_formats=sorted(EXPORTS[OutputType(a.output_type)]),
            )
            for a in job.artifacts
        ],
    )


def _preview(text: str, n: int = 160) -> str:
    """First `n` characters with runs of whitespace collapsed to one space."""
    return " ".join(text[: n * 8].split())[:n]


def _job_summary(job: Job) -> JobSummary:
    return JobSummary(
        id=job.id,
        status=job.status,
        source_name=job.source_name,
        output_types=[a.output_type for a in job.artifacts],
        created_at=job.created_at,
        source_kind=job.source_kind,
        source_preview=_preview(job.source_text),
        artifact_statuses={a.output_type: a.status for a in job.artifacts},
    )


@router.get("/output-types")
def output_types() -> list[str]:
    return [t.value for t in OutputType]


@router.post("/jobs", response_model=JobOut, status_code=202)
async def create_job(
    background: BackgroundTasks,
    output_types: str = Form(..., description='JSON list, e.g. ["linkedin","advisory"]'),
    params: str = Form("{}", description="JSON GenerationParams"),
    text: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> JobOut:
    settings = get_settings()
    try:
        types = [OutputType(t) for t in json.loads(output_types)]
        gen_params = GenerationParams(**json.loads(params))
    except (json.JSONDecodeError, ValueError, ValidationError) as e:
        raise HTTPException(422, f"Invalid output_types or params: {e}") from e
    if not types:
        raise HTTPException(422, "Select at least one output type")
    types = list(dict.fromkeys(types))

    parts: list[str] = []
    kind, name = "text", None
    if file is not None and file.filename:
        data = await file.read()
        if len(data) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, f"File larger than {settings.max_upload_mb} MB")
        try:
            src = await run_in_threadpool(extract, file.filename, data, get_provider())
        except UnsupportedSource as e:
            raise HTTPException(415, str(e)) from e
        kind, name = src.kind, src.name
        parts.append(src.text)
    if text and text.strip():
        parts.append(text.strip() if not parts else f"Operator context:\n{text.strip()}")
    source_text = "\n\n".join(p for p in parts if p.strip())
    if not source_text.strip():
        raise HTTPException(422, "Provide source text or a file with readable text")
    source_text = source_text[: settings.max_source_chars]

    job = Job(
        source_kind=kind,
        source_name=name,
        source_text=source_text,
        source_hash=audit.sha256(source_text),
        params=gen_params.model_dump(),
        artifacts=[Artifact(output_type=t.value) for t in types],
    )
    db.add(job)
    db.flush()
    audit.record(
        db,
        "job.created",
        {
            "job_id": job.id,
            "source_hash": job.source_hash,
            "output_types": [t.value for t in types],
            "params": job.params,
        },
    )
    db.commit()
    background.add_task(run_job, job.id)
    return _job_out(job)


@router.get("/jobs", response_model=list[JobSummary])
def list_jobs(
    limit: int = 20, offset: int = Query(0, ge=0), db: Session = Depends(get_db)
) -> list[JobSummary]:
    """Newest first. Page with `offset`; `limit` is capped at 100."""
    query = (
        select(Job)
        .options(selectinload(Job.artifacts))
        .order_by(Job.id.desc())
        .offset(offset)
        .limit(max(0, min(limit, 100)))
    )
    return [_job_summary(j) for j in db.scalars(query)]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobOut:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return _job_out(job)


@router.get("/audit/verify", response_model=AuditVerifyOut)
def verify_audit(db: Session = Depends(get_db)) -> AuditVerifyOut:
    valid, entries, broken_at = audit.verify(db)
    return AuditVerifyOut(valid=valid, entries=entries, broken_at=broken_at)


@router.get("/artifacts/{artifact_id}/verify", response_model=ArtifactVerifyOut)
def verify_artifact(artifact_id: int, db: Session = Depends(get_db)) -> ArtifactVerifyOut:
    """Check one artefact against its stored hash, its audit event and the audit chain."""
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(404, "Artifact not found")
    if artifact.status != "done":
        raise HTTPException(409, "Artifact is not ready")
    recomputed = (
        audit.sha256(audit.canonical(artifact.content)) if artifact.content is not None else None
    )
    hash_matches = recomputed is not None and recomputed == artifact.content_hash
    event = audit.artifact_event(db, artifact.job_id, artifact.id)
    recorded = event is not None and event.payload.get("content_hash") == artifact.content_hash
    chain_valid, entries, _ = audit.verify(db)
    return ArtifactVerifyOut(
        artifact_id=artifact.id,
        content_hash=artifact.content_hash,
        recomputed_hash=recomputed,
        hash_matches=hash_matches,
        audit_event_id=event.id if event else None,
        audit_event_hash=event.hash if event else None,
        audit_recorded=recorded,
        chain_valid=chain_valid,
        chain_entries=entries,
        verified=hash_matches and recorded and chain_valid,
    )


@router.get("/artifacts/{artifact_id}/download")
def download_artifact(artifact_id: int, fmt: str = "md", db: Session = Depends(get_db)) -> Response:
    artifact = db.get(Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(404, "Artifact not found")
    if artifact.status != "done" or artifact.content is None:
        raise HTTPException(409, "Artifact is not ready")
    try:
        data = render(OutputType(artifact.output_type), fmt, artifact.content)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    filename = f"{artifact.output_type}-{artifact.job_id}.{fmt}"
    return Response(
        data,
        media_type=MEDIA[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
