"""
Compositing engine — multi-slot version. Accepts up to character_count
photos and places each into the corresponding photo_slot from the theme's
parsed config, in order.
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Optional

import fitz
import numpy as np
from PIL import Image

try:
    import cv2
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False

try:
    from rembg import remove as rembg_remove
    _HAS_REMBG = True
except ImportError:
    _HAS_REMBG = False

from .marker_parser import TemplateConfig, PhotoSlot, TextBox

FACE_CASCADE_PATH = None
if _HAS_CV2:
    FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

PAPER_SIZES_PT = {
    "A4": (595.0, 842.0),
    "12x18": (864.0, 1296.0),   # 12in x 18in at 72pt/in
}


@dataclass
class GenerationResult:
    png_bytes: bytes
    used_face_detection: bool
    warnings: list


def _detect_face_crop(img: Image.Image, target_w: int, target_h: int) -> tuple[Image.Image, bool]:
    if not _HAS_CV2:
        return _center_crop(img, target_w, target_h), False
    cv_img = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    target_ratio = target_w / target_h
    iw, ih = img.size
    if len(faces) == 0:
        return _center_crop(img, target_w, target_h), False
    fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    cx, cy = fx + fw / 2, fy + fh / 2
    if iw / ih > target_ratio:
        crop_h = ih
        crop_w = int(crop_h * target_ratio)
    else:
        crop_w = iw
        crop_h = int(crop_w / target_ratio)
    x0 = int(max(0, min(iw - crop_w, cx - crop_w / 2)))
    y0 = int(max(0, min(ih - crop_h, cy - crop_h * 0.4)))
    x1, y1 = x0 + crop_w, y0 + crop_h
    return img.crop((x0, y0, x1, y1)).resize((target_w, target_h)), True


def _center_crop(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    iw, ih = img.size
    target_ratio = target_w / target_h
    if iw / ih > target_ratio:
        new_w = int(ih * target_ratio)
        x0 = (iw - new_w) // 2
        box = (x0, 0, x0 + new_w, ih)
    else:
        new_h = int(iw / target_ratio)
        y0 = (ih - new_h) // 2
        box = (0, y0, iw, y0 + new_h)
    return img.crop(box).resize((target_w, target_h))


def _apply_shape_mask(img: Image.Image, shape: str) -> Image.Image:
    if shape != "ellipse":
        return img
    mask = Image.new("L", img.size, 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, img.size[0], img.size[1]), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def _rembg_cutout(img: Image.Image, slot: PhotoSlot) -> Image.Image:
    if not _HAS_REMBG:
        return _center_crop(img, int(slot.w), int(slot.h)).convert("RGBA")
    cut = rembg_remove(img.convert("RGBA"))
    cw, ch = cut.size
    scale = min(slot.w / cw, slot.h / ch)
    new_size = (max(1, int(cw * scale)), max(1, int(ch * scale)))
    return cut.resize(new_size, Image.LANCZOS)


def _fit_font_size(text: str, box_w: float, box_h: float, base_size: float, min_size: float = 8.0) -> float:
    size = base_size
    avg_char_w_ratio = 0.55
    while size > min_size:
        est_w = len(text) * size * avg_char_w_ratio
        if est_w <= box_w:
            break
        size -= 1
    return max(size, min_size)


def _hex_to_rgb01(hexcolor: str) -> tuple[float, float, float]:
    h = hexcolor.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def generate(clean_template_path: str, config: TemplateConfig,
             photo_bytes_list: list[Optional[bytes]], field_values: dict[str, str],
             mode: str, paper_size: str = "A4", dpi: int = 300) -> GenerationResult:
    """
    photo_bytes_list: one entry per character slot, in the same order as
    config.photo_slots. Pass None for a slot to leave it empty (with a
    warning). Length may be <= len(config.photo_slots); extra slots are
    left empty.
    """
    warnings = list(config.warnings)
    doc = fitz.open(clean_template_path)
    page = doc[0]
    used_face_detection = False

    for i, slot in enumerate(config.photo_slots):
        photo_bytes = photo_bytes_list[i] if i < len(photo_bytes_list) else None
        if not photo_bytes:
            warnings.append(f"No photo supplied for slot {slot.slot_id}; left empty.")
            continue

        img = Image.open(io.BytesIO(photo_bytes))
        if mode == "sticker":
            processed = _rembg_cutout(img, slot)
            px = slot.x + (slot.w - processed.width) / 2
            py = slot.y + slot.h - processed.height
        else:
            processed, this_used_face = _detect_face_crop(img, int(slot.w), int(slot.h))
            used_face_detection = used_face_detection or this_used_face
            processed = _apply_shape_mask(processed, slot.shape)
            px, py = slot.x, slot.y

        buf = io.BytesIO()
        processed.save(buf, format="PNG")
        buf.seek(0)
        rect = fitz.Rect(px, py, px + processed.width, py + processed.height)
        page.insert_image(rect, stream=buf.read(), overlay=(slot.z_order == "above_card"))

    for tb in config.text_boxes:
        value = field_values.get(tb.field, "")
        if not value:
            continue
        size = _fit_font_size(value, tb.w, tb.h, tb.size)
        page.insert_textbox(
            fitz.Rect(tb.x, tb.y, tb.x + tb.w, tb.y + tb.h),
            value, fontsize=size, fontname="helv",
            color=_hex_to_rgb01(tb.color), align=0,
        )

    zoom = dpi / 72.0
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    png_bytes = pix.tobytes("png")
    doc.close()
    return GenerationResult(png_bytes=png_bytes, used_face_detection=used_face_detection, warnings=warnings)


def export_pdf(clean_template_path: str, config: TemplateConfig,
                photo_bytes_list: list[Optional[bytes]], field_values: dict[str, str],
                mode: str) -> bytes:
    """Same composition as generate(), but returns a PDF instead of a
    rasterized PNG — used for the finalize/download step's final_pdf_url."""
    doc = fitz.open(clean_template_path)
    page = doc[0]

    for i, slot in enumerate(config.photo_slots):
        photo_bytes = photo_bytes_list[i] if i < len(photo_bytes_list) else None
        if not photo_bytes:
            continue
        img = Image.open(io.BytesIO(photo_bytes))
        if mode == "sticker":
            processed = _rembg_cutout(img, slot)
            px = slot.x + (slot.w - processed.width) / 2
            py = slot.y + slot.h - processed.height
        else:
            processed, _ = _detect_face_crop(img, int(slot.w), int(slot.h))
            processed = _apply_shape_mask(processed, slot.shape)
            px, py = slot.x, slot.y
        buf = io.BytesIO()
        processed.save(buf, format="PNG")
        buf.seek(0)
        rect = fitz.Rect(px, py, px + processed.width, py + processed.height)
        page.insert_image(rect, stream=buf.read(), overlay=(slot.z_order == "above_card"))

    for tb in config.text_boxes:
        value = field_values.get(tb.field, "")
        if not value:
            continue
        size = _fit_font_size(value, tb.w, tb.h, tb.size)
        page.insert_textbox(
            fitz.Rect(tb.x, tb.y, tb.x + tb.w, tb.y + tb.h),
            value, fontsize=size, fontname="helv",
            color=_hex_to_rgb01(tb.color), align=0,
        )

    return doc.tobytes()
