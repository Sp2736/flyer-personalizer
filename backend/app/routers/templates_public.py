from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db, Template
from ..core.storage import signed_url, TEMPLATES_BUCKET

router = APIRouter(tags=["public"])


@router.get("/templates/active/detailed")
def list_active_templates_detailed(db: Session = Depends(get_db)):
    """
    Same as /templates/active but includes signed URLs to the template's
    clean PDF (for the frontend to render a thumbnail/preview) and page
    dimensions from config_json — everything the frontend needs to build
    the event/template picker without touching Supabase Storage directly.
    """
    templates = db.query(Template).filter(Template.status == "active").all()
    out = []
    for t in templates:
        out.append({
            "id": t.id,
            "name": t.name,
            "mode": t.mode,
            "page_size": t.config_json.get("page_size"),
            "preview_pdf_url": signed_url(TEMPLATES_BUCKET, t.clean_pdf_key, expires_in_seconds=3600),
        })
    return out
