import logging

from app import audit
from app.db import SessionLocal
from app.generators import generate
from app.llm import LLMError, get_provider
from app.models import Job
from app.schemas import GenerationParams, OutputType

log = logging.getLogger(__name__)


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
            job.status = "failed"
            db.commit()
    finally:
        db.close()
