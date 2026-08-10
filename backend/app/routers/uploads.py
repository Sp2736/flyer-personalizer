from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from ..core.storage import presigned_upload, upload_bytes, new_key, UPLOADS_BUCKET

router = APIRouter(tags=["public"])


class PresignRequest(BaseModel):
    content_type: str


@router.post("/uploads/presign")
def presign_upload(body: PresignRequest):
    """Matches PresignRequest/PresignResponse in lib/api.ts exactly."""
    ext = body.content_type.split("/")[-1] if "/" in body.content_type else "bin"
    if ext not in ("jpeg", "jpg", "png", "webp"):
        raise HTTPException(400, "Only JPEG, PNG, and WebP images are allowed")
    key = new_key("photos", ext)
    result = presigned_upload(UPLOADS_BUCKET, key)
    return result


@router.put("/uploads/local/{bucket}/{key:path}")
async def upload_local_fallback(bucket: str, key: str, request: Request):
    """
    Only reachable when SUPABASE_URL isn't configured — storage.py's
    presigned_upload() then points the frontend's PUT at this route
    instead of a real Supabase signed URL, so local dev works without
    cloud creds. Never used in production (Supabase handles the PUT
    directly there, this route isn't even referenced).
    """
    body = await request.body()
    upload_bytes(bucket, key, body, request.headers.get("content-type", "application/octet-stream"))
    return {"ok": True, "key": key}
