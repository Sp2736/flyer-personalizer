from __future__ import annotations
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session
from ..core.db import get_db, Generation, Theme
from ..core.storage import signed_url, GENERATED_BUCKET, UPLOADS_BUCKET

router = APIRouter(tags=["public"])


@router.get("/history")
def get_history(
    search: str | None = Query(default=None),
    date: str | None = Query(default=None),
    theme: str | None = Query(default=None),
    db: Session = Depends(get_db),
    x_college_id: str = Header(default="default"),
):
    college_id = x_college_id or "default"
    q = db.query(Generation).filter(Generation.college_id == college_id, Generation.status == "finalized")
    if date:
        q = q.filter(Generation.created_at.cast(str).like(f"{date}%"))
    generations = q.order_by(Generation.created_at.desc()).all()

    out = []
    for gen in generations:
        th = db.query(Theme).get(gen.theme_id)
        theme_name = th.name if th else "Unknown theme"
        if search and search.lower() not in (gen.student_name or "").lower():
            continue
        if theme and theme.lower() not in theme_name.lower():
            continue
        photo_url = ""
        if gen.photo_storage_paths:
            photo_url = signed_url(UPLOADS_BUCKET, gen.photo_storage_paths[0])
        out.append({
            "id": gen.id,
            "created_at": gen.created_at.isoformat(),
            "student_name": gen.student_name or "",
            "school_name": gen.school_name or "",
            "theme_name": theme_name,
            "paper_size": gen.paper_size,
            "student_photo_url": photo_url,
            "preview_url": signed_url(GENERATED_BUCKET, gen.preview_key) if gen.preview_key else "",
            "final_pdf_url": signed_url(GENERATED_BUCKET, gen.final_pdf_key) if gen.final_pdf_key else "",
        })
    return out
