import logging

from sqlalchemy import select

from app import audit
from app.db import SessionLocal
from app.generators import generate
from app.llm import LLMError, get_provider
from app.models import Job
from app.schemas import GenerationParams, OutputType

log = logging.getLogger(__name__)

UNFINISHED = ("pending", "running")


def _fail_unfinished(job: Job, error: str) -> None:
    """Mark the job failed, and every artefact that never finished with `error`."""
    for artifact in job.artifacts:
        if artifact.status in UNFINISHED:
            artifact.status = "failed"
            artifact.error = error
    job.status = "failed"


def run_job(job_id: int) -> None:
    """Generate every requested artefact for a job. Runs in the background after the
    request returns; each artefact succeeds or fails on its own."""
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if job is None:
            return
        job.status = "running"
        db.commit()

        provider = get_provider()
        params = GenerationParams(**job.params)
        for artifact in job.artifacts:
            artifact.status = "running"
            db.commit()
            try:
                artifact.content = generate(
                    provider, OutputType(artifact.output_type), job.source_text, params
                )
                artifact.content_hash = audit.sha256(audit.canonical(artifact.content))
                artifact.status = "done"
                audit.record(
                    db,
                    "artifact.generated",
                    {
                        "job_id": job.id,
                        "artifact_id": artifact.id,
                        "output_type": artifact.output_type,
                        "source_hash": job.source_hash,
                        "content_hash": artifact.content_hash,
                        "provider": provider.name,
                    },
                )
            except (LLMError, ValueError) as e:
                log.warning("artifact %s failed: %s", artifact.id, e)
                artifact.status = "failed"
                artifact.error = str(e)
            db.commit()

        job.status = "failed" if all(a.status == "failed" for a in job.artifacts) else "done"
        db.commit()
    except Exception:
        log.exception("job %s crashed", job_id)
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            _fail_unfinished(job, "Generation was interrupted")
            db.commit()
    finally:
        db.close()


def recover_interrupted_jobs() -> int:
    """Fail jobs a previous process left pending or running. Jobs run in-process (BackgroundTasks
    on a single worker), so anything unfinished at startup will never complete. Returns the count."""
    with SessionLocal() as db:
        jobs = db.scalars(select(Job).where(Job.status.in_(UNFINISHED))).all()
        for job in jobs:
            _fail_unfinished(job, "Generation was interrupted by a server restart")
        db.commit()
    if jobs:
        log.warning("marked %d interrupted job(s) as failed", len(jobs))
    return len(jobs)
