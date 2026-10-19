from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class OutputType(str, Enum):
    video = "video"
    linkedin = "linkedin"
    twitter = "twitter"
    advisory = "advisory"
    infographic = "infographic"
    executive_summary = "executive_summary"
    presentation = "presentation"


class GenerationParams(BaseModel):
    audience: str = "general public"
    tone: str = "professional"
    language: str = "English"
    detail_level: str = Field("medium", pattern="^(brief|medium|detailed)$")
    objective: str = "inform"
    style: str = "clear and factual"


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class ArtifactOut(BaseModel):
    id: int
    output_type: OutputType
    status: JobStatus
    content: dict[str, Any] | None
    error: str | None
    content_hash: str | None
    export_formats: list[str] = []


class JobOut(BaseModel):
    id: int
    status: JobStatus
    source_kind: str
    source_name: str | None
    source_preview: str
    params: GenerationParams
    created_at: datetime
    artifacts: list[ArtifactOut]


class JobSummary(BaseModel):
    id: int
    status: JobStatus
    source_name: str | None
    output_types: list[OutputType]
    created_at: datetime
    source_kind: str
    source_preview: str = Field(description="First 160 characters, whitespace collapsed")
    artifact_statuses: dict[str, JobStatus] = Field(description="output_type -> status")


class AuditVerifyOut(BaseModel):
    valid: bool
    entries: int
    broken_at: int | None = None


class ArtifactVerifyOut(BaseModel):
    """Tamper evidence for one artefact: its content still hashes to the stored value,
    the audit log recorded that hash, and the audit chain itself is intact."""

    artifact_id: int
    content_hash: str | None
    recomputed_hash: str | None
    hash_matches: bool
    audit_event_id: int | None
    audit_event_hash: str | None
    audit_recorded: bool
    chain_valid: bool
    chain_entries: int
    verified: bool
