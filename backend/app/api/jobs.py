import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import audit
from app.config import get_settings
from app.db import get_db
from app.ingest import UnsupportedSource, extract
from app.models import Artifact, Job
from app.schemas import (
    ArtifactOut,
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
            )
            for a in job.artifacts
        ],
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
            src = extract(file.filename, data)
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
def list_jobs(limit: int = 20, db: Session = Depends(get_db)) -> list[JobSummary]:
    jobs = db.scalars(select(Job).order_by(Job.id.desc()).limit(min(limit, 100)))
    return [
        JobSummary(
            id=j.id,
            status=j.status,
            source_name=j.source_name,
            output_types=[a.output_type for a in j.artifacts],
            created_at=j.created_at,
        )
        for j in jobs
    ]


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
