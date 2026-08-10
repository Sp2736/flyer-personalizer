from __future__ import annotations
from datetime import datetime
from sqlalchemy.orm import Session
from .db import SessionLocal, Generation
from .storage import delete, GENERATED_BUCKET


def run_cleanup() -> dict:
    db: Session = SessionLocal()
    deleted = 0
    try:
        expired = db.query(Generation).filter(
            Generation.expires_at < datetime.utcnow(),
            Generation.status == "previewed",   # never delete a finalized/paid-for generation
        ).all()
        for gen in expired:
            if gen.preview_key:
                delete(GENERATED_BUCKET, gen.preview_key)
            db.delete(gen)
            deleted += 1
        db.commit()
    finally:
        db.close()
    return {"deleted": deleted}
