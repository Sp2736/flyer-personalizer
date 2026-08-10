"""
Marker parsing for Custom Event Poster Generator / Sticker Sheet Personalizer.

Two marker kinds can appear on a template's Marker Map PDF:
  - PHOTO/STICKER slots: magenta FF00FF filled shapes -> photo_box / character slots
  - TEXT fields: literal placeholder text runs like {{NAME}}, {{ID}} -> text boxes,
    with font/size/color captured from the marker text itself so the real render
    matches the designer's intent without manual config.

This module is template-agnostic: a flyer template will yield photo_box + text
boxes; a sticker template will yield N magenta slots and no text boxes. The
config JSON produced here is what gets persisted per template (see FR-1.4).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Optional

import fitz  # PyMuPDF

SLOT_MARKER_RGB = (1.0, 0.0, 1.0)  # magenta FF00FF
COLOR_TOLERANCE = 0.08
TEXT_TOKEN_RE = re.compile(r"\{\{\s*([A-Z0-9_]+)\s*\}\}")


def _rgb_to_hex(rgb) -> str:
    if rgb is None:
        return "#000000"
    r, g, b = [max(0, min(255, round(c * 255))) for c in rgb[:3]]
    return f"#{r:02X}{g:02X}{b:02X}"


def _color_matches(fill, target, tol=COLOR_TOLERANCE) -> bool:
    if fill is None or len(fill) < 3:
        return False
    return all(abs(fill[i] - target[i]) <= tol for i in range(3))


@dataclass
class PhotoSlot:
    slot_id: str
    x: float
    y: float
    w: float
    h: float
    shape: str = "rectangle"          # 'rectangle' | 'ellipse'
    anchor_mode: str = "center"       # 'center' | 'bottom-center'
    bleed_pct: float = 0.0
    z_order: str = "above_card"       # 'above_card' | 'behind_card'


@dataclass
class TextBox:
    field: str                        # NAME, ID, etc (token without braces)
    x: float
    y: float
    w: float
    h: float
    font: str = "helv"
    size: float = 24.0
    color: str = "#1A1A1A"
    align: str = "left"


@dataclass
class TemplateConfig:
    template_id: str
    page_size: tuple[float, float]
    mode: str                          # 'flyer' | 'sticker'
    photo_slots: list[PhotoSlot] = field(default_factory=list)
    text_boxes: list[TextBox] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def _find_marker_rects(page, target_color, shape_hint: bool = True):
    """Return list of (fitz.Rect, shape_type) for filled shapes matching target_color."""
    out = []
    for drawing in page.get_drawings():
        fill = drawing.get("fill")
        if not _color_matches(fill, target_color):
            continue
        rect = drawing.get("rect")
        if rect is None:
            continue
        # crude ellipse detection: PyMuPDF marks curved items in 'items' with "c" (curve) ops
        shape_type = "rectangle"
        for item in drawing.get("items", []):
            if item[0] == "c":
                shape_type = "ellipse"
                break
        out.append((fitz.Rect(rect), shape_type))
    return out


def _find_text_tokens(page) -> list[dict]:
    """Find {{TOKEN}} text runs and capture their box + font metadata."""
    results = []
    text_dict = page.get_text("dict")
    for block in text_dict.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "")
                m = TEXT_TOKEN_RE.search(text)
                if not m:
                    continue
                bbox = span.get("bbox")
                results.append({
                    "field": m.group(1),
                    "bbox": bbox,
                    "font": span.get("font", "helv"),
                    "size": span.get("size", 24.0),
                    "color": _rgb_to_hex_int(span.get("color", 0)),
                })
    return results


def _rgb_to_hex_int(color_int: int) -> str:
    r = (color_int >> 16) & 255
    g = (color_int >> 8) & 255
    b = color_int & 255
    return f"#{r:02X}{g:02X}{b:02X}"


def parse_template(marker_pdf_path: str, template_id: str, mode: str,
                    anchor_mode: str = "center", bleed_pct: float = 0.0) -> TemplateConfig:
    """
    Parse a Marker Map PDF into a TemplateConfig.

    mode='flyer'   -> expects one photo_box (magenta) + {{NAME}}/{{ID}} text tokens (FR-1.2)
    mode='sticker' -> expects N magenta slots, no text tokens (per sticker notebook)
    """
    doc = fitz.open(marker_pdf_path)
    page = doc[0]
    cfg = TemplateConfig(
        template_id=template_id,
        page_size=(page.rect.width, page.rect.height),
        mode=mode,
    )

    marker_rects = _find_marker_rects(page, SLOT_MARKER_RGB)
    for i, (rect, shape_type) in enumerate(marker_rects):
        w, h = rect.width, rect.height
        bx0 = rect.x0 - w * bleed_pct
        by0 = rect.y0 - h * bleed_pct
        bx1 = rect.x1 + w * bleed_pct
        by1 = rect.y1 + h * bleed_pct
        cfg.photo_slots.append(PhotoSlot(
            slot_id=f"slot_{i}",
            x=bx0, y=by0, w=(bx1 - bx0), h=(by1 - by0),
            shape=shape_type,
            anchor_mode=anchor_mode,
            bleed_pct=bleed_pct,
        ))

    if mode == "flyer":
        for tok in _find_text_tokens(page):
            x0, y0, x1, y1 = tok["bbox"]
            cfg.text_boxes.append(TextBox(
                field=tok["field"], x=x0, y=y0, w=(x1 - x0), h=(y1 - y0),
                font=tok["font"], size=tok["size"], color=tok["color"],
            ))
        if not cfg.photo_slots:
            cfg.warnings.append("No magenta photo marker found (required for flyer mode).")
        if not any(t.field == "NAME" for t in cfg.text_boxes):
            cfg.warnings.append("No {{NAME}} text token found.")

    if mode == "sticker" and not cfg.photo_slots:
        cfg.warnings.append("No magenta character slots found (required for sticker mode).")

    doc.close()
    return cfg
