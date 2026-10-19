import hashlib
import json
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import AuditEvent

GENESIS = "0" * 64
_LOCK_KEY = 26154


def sha256(data: str | bytes) -> str:
    if isinstance(data, str):
        data = data.encode()
    return hashlib.sha256(data).hexdigest()


def canonical(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def _event_hash(prev_hash: str, action: str, actor: str, payload: dict[str, Any]) -> str:
    return sha256(prev_hash + canonical({"action": action, "actor": actor, "payload": payload}))


def record(db: Session, action: str, payload: dict[str, Any], actor: str = "anonymous") -> AuditEvent:
    if db.bind.dialect.name == "postgresql":
        # Serialise appends so two concurrent writers can't both link to the same previous hash.
        db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": _LOCK_KEY})
    last = db.scalar(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1))
    prev = last.hash if last else GENESIS
    event = AuditEvent(
        action=action,
        actor=actor,
        payload=payload,
        prev_hash=prev,
        hash=_event_hash(prev, action, actor, payload),
    )
    db.add(event)
    db.flush()
    return event


def verify(db: Session) -> tuple[bool, int, int | None]:
    prev = GENESIS
    count = 0
    for event in db.scalars(select(AuditEvent).order_by(AuditEvent.id)):
        count += 1
        expected = _event_hash(prev, event.action, event.actor, event.payload)
        if event.prev_hash != prev or event.hash != expected:
            return False, count, event.id
        prev = event.hash
    return True, count, None
