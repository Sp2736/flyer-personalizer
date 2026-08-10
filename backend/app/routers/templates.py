from __future__ import annotations

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
import tempfile, os

from ..core.db import get_db, Template
from ..core.marker_parser import parse_template
from ..core.storage import upload_bytes, new_key, TEMPLATES_BUCKET
from ..core.auth import require_admin

router = APIRouter(prefix="/admin/templates", tags=["admin"], dependencies=[Depends(require_admin)])

MAX_TEMPLATE_MB = 25


@router.post("")
async def upload_template(
    name: str = Form(...),
    mode: str = Form(...),                       # 'flyer' | 'sticker'
    marker_pdf: UploadFile = File(...),
    clean_pdf: UploadFile = File(...),
    anchor_mode: str = Form("center"),
    bleed_pct: float = Form(0.0),
    db: Session = Depends(get_db),
):
    if mode not in ("flyer", "sticker"):
        raise HTTPException(400, "mode must be 'flyer' or 'sticker'")

    marker_bytes = await marker_pdf.read()
    clean_bytes = await clean_pdf.read()
    if len(marker_bytes) > MAX_TEMPLATE_MB * 1024 * 1024 or len(clean_bytes) > MAX_TEMPLATE_MB * 1024 * 1024:
        raise HTTPException(413, f"Template PDF exceeds {MAX_TEMPLATE_MB}MB limit")  # FR-1.1

    # parse markers off a temp copy of the marker map
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(marker_bytes)
        tmp_path = tmp.name
    try:
        config = parse_template(tmp_path, template_id="pending", mode=mode,
                                 anchor_mode=anchor_mode, bleed_pct=bleed_pct)
    finally:
        os.unlink(tmp_path)

    if config.warnings:
        # FR-1.3: reject/flag templates missing required markers
        raise HTTPException(422, {"message": "Template missing required markers", "warnings": config.warnings})

    marker_key = upload_bytes(TEMPLATES_BUCKET, new_key("markers", "pdf"), marker_bytes, "application/pdf")
    clean_key = upload_bytes(TEMPLATES_BUCKET, new_key("clean", "pdf"), clean_bytes, "application/pdf")

    tmpl = Template(
        name=name, mode=mode,
        marker_pdf_key=marker_key, clean_pdf_key=clean_key,
        config_json=config.to_dict(), status="inactive",
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    config.template_id = tmpl.id
    tmpl.config_json = config.to_dict()
    db.commit()

    return {"template_id": tmpl.id, "config": tmpl.config_json}


@router.get("")
def list_templates(db: Session = Depends(get_db)):
    return [
        {"id": t.id, "name": t.name, "mode": t.mode, "status": t.status, "created_at": t.created_at}
        for t in db.query(Template).order_by(Template.created_at.desc()).all()
    ]


@router.patch("/{template_id}")
def set_status(template_id: str, status: str = Form(...), db: Session = Depends(get_db)):
    if status not in ("active", "inactive"):
        raise HTTPException(400, "status must be 'active' or 'inactive'")
    tmpl = db.query(Template).get(template_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    tmpl.status = status
    db.commit()
    return {"id": tmpl.id, "status": tmpl.status}


@router.get("/{template_id}/preview")
def preview(template_id: str, db: Session = Depends(get_db)):
    """FR-1.5: dummy-filled preview render before publishing."""
    from ..core.compositor import generate
    from ..core.marker_parser import TemplateConfig, PhotoSlot, TextBox
    import tempfile

    tmpl = db.query(Template).get(template_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")

    from ..core.storage import download_bytes
    clean_bytes = download_bytes(TEMPLATES_BUCKET, tmpl.clean_pdf_key)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(clean_bytes)
        tmp_path = tmp.name

    cfg_dict = tmpl.config_json
    cfg = TemplateConfig(
        template_id=tmpl.id, page_size=tuple(cfg_dict["page_size"]), mode=tmpl.mode,
        photo_slots=[PhotoSlot(**s) for s in cfg_dict["photo_slots"]],
        text_boxes=[TextBox(**t) for t in cfg_dict["text_boxes"]],
    )
    dummy_values = {"NAME": "Jane Attendee", "ID": "22CE099"}
    result = generate(tmp_path, cfg, photo_bytes=None, field_values=dummy_values)
    os.unlink(tmp_path)

    from fastapi.responses import Response
    return Response(content=result.png_bytes, media_type="image/png")
