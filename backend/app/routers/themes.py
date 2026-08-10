from __future__ import annotations
import os
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.db import get_db, Theme, Module
from ..core.marker_parser import parse_template, TemplateConfig, PhotoSlot, TextBox
from ..core.compositor import generate as run_generate
from ..core.storage import upload_bytes, download_bytes, signed_url, new_key, THEMES_BUCKET
from ..core.auth import require_admin

public_router = APIRouter(tags=["public"])
admin_router = APIRouter(prefix="/admin/themes", tags=["admin"], dependencies=[Depends(require_admin)])

MAX_THEME_MB = 25


@public_router.get("/themes")
def list_themes(module: str = Query(...), db: Session = Depends(get_db)):
    """Matches ThemeItem[] in lib/api.ts exactly."""
    themes = db.query(Theme).filter(Theme.module_id == module, Theme.status == "active").all()
    out = []
    for t in themes:
        thumb_url = signed_url(THEMES_BUCKET, t.thumbnail_key) if t.thumbnail_key else ""
        out.append({
            "id": t.id, "name": t.name, "module_id": t.module_id,
            "preview_thumbnail_url": thumb_url,
        })
    return out


@admin_router.post("")
async def upload_theme(
    module_id: str = Form(...),
    name: str = Form(...),
    mode: str = Form(...),                        # 'flyer' | 'sticker' — drives compositing behavior
    default_paper_size: str = Form("A4"),
    max_character_count: int = Form(1),
    marker_pdf: UploadFile = File(...),
    clean_pdf: UploadFile = File(...),
    anchor_mode: str = Form("center"),
    bleed_pct: float = Form(0.0),
    db: Session = Depends(get_db),
):
    if not db.query(Module).get(module_id):
        raise HTTPException(404, f"Module '{module_id}' not found — check GET /modules for valid ids")
    if mode not in ("flyer", "sticker"):
        raise HTTPException(400, "mode must be 'flyer' or 'sticker'")

    marker_bytes = await marker_pdf.read()
    clean_bytes = await clean_pdf.read()
    if len(marker_bytes) > MAX_THEME_MB * 1024 * 1024 or len(clean_bytes) > MAX_THEME_MB * 1024 * 1024:
        raise HTTPException(413, f"Template PDF exceeds {MAX_THEME_MB}MB limit")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(marker_bytes)
        tmp_path = tmp.name
    try:
        config = parse_template(tmp_path, template_id="pending", mode=mode,
                                 anchor_mode=anchor_mode, bleed_pct=bleed_pct)
    finally:
        os.unlink(tmp_path)

    if config.warnings:
        raise HTTPException(422, {"message": "Theme missing required markers", "warnings": config.warnings})

    marker_key = upload_bytes(THEMES_BUCKET, new_key("markers", "pdf"), marker_bytes, "application/pdf")
    clean_key = upload_bytes(THEMES_BUCKET, new_key("clean", "pdf"), clean_bytes, "application/pdf")

    theme = Theme(
        module_id=module_id, name=name,
        marker_pdf_key=marker_key, clean_pdf_key=clean_key,
        config_json=config.to_dict(), default_paper_size=default_paper_size,
        max_character_count=max_character_count, status="inactive",
    )
    db.add(theme)
    db.commit()
    db.refresh(theme)

    # generate a dummy-filled thumbnail immediately so admins can preview
    # without a separate step, and so preview_thumbnail_url is never empty
    # once activated
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(clean_bytes)
        tmp_path = tmp.name
    try:
        cfg = TemplateConfig(
            template_id=theme.id, page_size=tuple(theme.config_json["page_size"]), mode=mode,
            photo_slots=[PhotoSlot(**s) for s in theme.config_json["photo_slots"]],
            text_boxes=[TextBox(**t) for t in theme.config_json["text_boxes"]],
        )
        dummy_photos = [None] * len(cfg.photo_slots)
        result = run_generate(tmp_path, cfg, dummy_photos,
                               {"NAME": "Jane Attendee", "STUDENT_NAME": "Jane Attendee",
                                "SCHOOL_NAME": "Demo School", "ID": "SAMPLE001"},
                               mode=mode)
        thumb_key = upload_bytes(THEMES_BUCKET, new_key("thumbnails", "png"), result.png_bytes, "image/png")
        theme.thumbnail_key = thumb_key
        db.commit()
    finally:
        os.unlink(tmp_path)

    return {"theme_id": theme.id, "config": theme.config_json}


@admin_router.get("")
def list_all_themes(db: Session = Depends(get_db)):
    themes = db.query(Theme).order_by(Theme.created_at.desc()).all()
    return [
        {"id": t.id, "module_id": t.module_id, "name": t.name, "status": t.status,
         "max_character_count": t.max_character_count, "default_paper_size": t.default_paper_size}
        for t in themes
    ]


@admin_router.patch("/{theme_id}")
def set_theme_status(theme_id: str, status: str = Form(...), db: Session = Depends(get_db)):
    if status not in ("active", "inactive"):
        raise HTTPException(400, "status must be 'active' or 'inactive'")
    theme = db.query(Theme).get(theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    theme.status = status
    db.commit()
    return {"id": theme.id, "status": theme.status}


@admin_router.get("/{theme_id}/preview")
def preview_theme(theme_id: str, db: Session = Depends(get_db)):
    from fastapi.responses import Response
    theme = db.query(Theme).get(theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    if not theme.thumbnail_key:
        raise HTTPException(404, "No thumbnail generated for this theme yet")
    return Response(content=download_bytes(THEMES_BUCKET, theme.thumbnail_key), media_type="image/png")
