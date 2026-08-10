from __future__ import annotations
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..core.storage import download_bytes

router = APIRouter(tags=["public"])


@router.get("/download/local/{bucket}/{key:path}")
def download_local(bucket: str, key: str):
    try:
        data = download_bytes(bucket, key)
    except FileNotFoundError:
        raise HTTPException(404, "File not found or expired")
    media_type = "application/pdf" if key.endswith(".pdf") else "image/png"
    return Response(content=data, media_type=media_type)
