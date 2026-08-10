from __future__ import annotations
import tempfile, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..core.db import get_db, Theme, Generation, CreditAccount
from ..core.marker_parser import TemplateConfig, PhotoSlot, TextBox
from ..core.compositor import generate as run_generate, export_pdf
from ..core.storage import (
    download_bytes, upload_bytes, signed_url, new_key,
    THEMES_BUCKET, GENERATED_BUCKET, UPLOADS_BUCKET, retention_deadline,
)

router = APIRouter(tags=["public"])
limiter = Limiter(key_func=get_remote_address)


class PreviewRequest(BaseModel):
    module: str
    theme_id: str
    paper_size: str
    character_count: int
    student_name: str
    school_name: str
    photo_storage_paths: list[str]


def _get_or_create_credits(db: Session, college_id: str) -> CreditAccount:
    acct = db.query(CreditAccount).get(college_id)
    if not acct:
        acct = CreditAccount(college_id=college_id, remaining=10)
        db.add(acct)
        db.commit()
        db.refresh(acct)
    return acct


@router.post("/generate/preview")
@limiter.limit("15/minute")
def generate_preview(request: Request, body: PreviewRequest, db: Session = Depends(get_db),
                      x_college_id: str = Header(default="default")):
    theme = db.query(Theme).filter(Theme.id == body.theme_id, Theme.status == "active").first()
    if not theme:
        raise HTTPException(404, "Theme not found or not active")

    college_id = x_college_id or "default"  # see note at top of this file re: no real auth yet
    acct = _get_or_create_credits(db, college_id)
    if acct.remaining <= 0:
        raise HTTPException(402, "No credits remaining")

    cfg_dict = theme.config_json
    cfg = TemplateConfig(
        template_id=theme.id, page_size=tuple(cfg_dict["page_size"]), mode="sticker" if theme.max_character_count > 1 else "flyer",
        photo_slots=[PhotoSlot(**s) for s in cfg_dict["photo_slots"]],
        text_boxes=[TextBox(**t) for t in cfg_dict["text_boxes"]],
    )
    # infer mode from module id convention rather than character count alone
    mode = "sticker" if "sticker" in body.module else "flyer"

    photo_bytes_list = []
    for path in body.photo_storage_paths[:body.character_count]:
        try:
            photo_bytes_list.append(download_bytes(UPLOADS_BUCKET, path))
        except Exception:
            photo_bytes_list.append(None)

    clean_bytes = download_bytes(THEMES_BUCKET, theme.clean_pdf_key)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(clean_bytes)
        tmp_path = tmp.name
    try:
        result = run_generate(
            tmp_path, cfg, photo_bytes_list,
            field_values={
                "NAME": body.student_name, "STUDENT_NAME": body.student_name,
                "SCHOOL_NAME": body.school_name,
            },
            mode=mode, paper_size=body.paper_size,
        )
    finally:
        os.unlink(tmp_path)

    preview_key = upload_bytes(GENERATED_BUCKET, new_key("previews", "png"), result.png_bytes, "image/png")

    gen = Generation(
        module_id=body.module, theme_id=theme.id, college_id=college_id,
        paper_size=body.paper_size, character_count=body.character_count,
        student_name=body.student_name, school_name=body.school_name,
        photo_storage_paths=body.photo_storage_paths,
        preview_key=preview_key, status="previewed",
        expires_at=retention_deadline(hours=24),
    )
    db.add(gen)
    db.commit()
    db.refresh(gen)

    return {"generation_id": gen.id, "preview_url": signed_url(GENERATED_BUCKET, preview_key)}


@router.post("/generate/{generation_id}/download")
@limiter.limit("15/minute")
def finalize_download(request: Request, generation_id: str, db: Session = Depends(get_db),
                       x_college_id: str = Header(default="default")):
    gen = db.query(Generation).get(generation_id)
    if not gen:
        raise HTTPException(404, "Generation not found")
    theme = db.query(Theme).get(gen.theme_id)
    if not theme:
        raise HTTPException(404, "Theme for this generation no longer exists")

    college_id = x_college_id or "default"
    acct = _get_or_create_credits(db, college_id)

    if gen.status != "finalized":
        cfg_dict = theme.config_json
        cfg = TemplateConfig(
            template_id=theme.id, page_size=tuple(cfg_dict["page_size"]), mode="flyer",
            photo_slots=[PhotoSlot(**s) for s in cfg_dict["photo_slots"]],
            text_boxes=[TextBox(**t) for t in cfg_dict["text_boxes"]],
        )
        mode = "sticker" if "sticker" in gen.module_id else "flyer"

        photo_bytes_list = []
        for path in (gen.photo_storage_paths or [])[:gen.character_count]:
            try:
                photo_bytes_list.append(download_bytes(UPLOADS_BUCKET, path))
            except Exception:
                photo_bytes_list.append(None)

        clean_bytes = download_bytes(THEMES_BUCKET, theme.clean_pdf_key)
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(clean_bytes)
            tmp_path = tmp.name
        try:
            field_values = {
                "NAME": gen.student_name or "", "STUDENT_NAME": gen.student_name or "",
                "SCHOOL_NAME": gen.school_name or "",
            }
            png_result = run_generate(tmp_path, cfg, photo_bytes_list, field_values, mode=mode, paper_size=gen.paper_size)
            pdf_bytes = export_pdf(tmp_path, cfg, photo_bytes_list, field_values, mode=mode)
        finally:
            os.unlink(tmp_path)

        final_png_key = upload_bytes(GENERATED_BUCKET, new_key("finals", "png"), png_result.png_bytes, "image/png")
        final_pdf_key = upload_bytes(GENERATED_BUCKET, new_key("finals", "pdf"), pdf_bytes, "application/pdf")

        gen.final_png_key = final_png_key
        gen.final_pdf_key = final_pdf_key
        gen.status = "finalized"

        # spend one credit only the first time a generation is finalized —
        # repeated downloads of the same generation are free
        acct.remaining = max(0, acct.remaining - 1)
        acct.updated_at = datetime.utcnow()
        db.commit()

    return {
        "final_pdf_url": signed_url(GENERATED_BUCKET, gen.final_pdf_key),
        "final_png_url": signed_url(GENERATED_BUCKET, gen.final_png_key),
    }
