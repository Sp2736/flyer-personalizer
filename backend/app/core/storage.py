"""
Object storage. Supabase Storage in production; local-disk fallback when no
SUPABASE_URL/SUPABASE_SERVICE_KEY are set, so the app runs with zero cloud
creds for quick local iteration.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from datetime import datetime, timedelta

LOCAL_ROOT = Path(os.getenv("LOCAL_STORAGE_ROOT", "./storage_local"))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

_client = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    from supabase import create_client
    _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

THEMES_BUCKET = "themes"
GENERATED_BUCKET = "generated"
UPLOADS_BUCKET = "uploads"


def _local_path(bucket: str, key: str) -> Path:
    p = LOCAL_ROOT / bucket / key
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    if _client:
        _client.storage.from_(bucket).upload(key, data, {"content-type": content_type, "upsert": "true"})
        return key
    _local_path(bucket, key).write_bytes(data)
    return key


def download_bytes(bucket: str, key: str) -> bytes:
    if _client:
        return _client.storage.from_(bucket).download(key)
    return _local_path(bucket, key).read_bytes()


def signed_url(bucket: str, key: str, expires_in_seconds: int = 3600) -> str:
    if _client:
        res = _client.storage.from_(bucket).create_signed_url(key, expires_in_seconds)
        return res.get("signedURL") or res.get("signed_url", "")
    return f"{API_BASE_URL}/download/local/{bucket}/{key}"


def presigned_upload(bucket: str, key: str) -> dict:
    """Matches lib/api.ts's PresignResponse: {upload_url, storage_path}."""
    if _client:
        res = _client.storage.from_(bucket).create_signed_upload_url(key)
        url = res.get("signed_url") or res.get("signedUrl") or res.get("signedURL")
        return {"upload_url": url, "storage_path": key}
    return {"upload_url": f"{API_BASE_URL}/uploads/local/{bucket}/{key}", "storage_path": key}


def delete(bucket: str, key: str) -> None:
    if _client:
        _client.storage.from_(bucket).remove([key])
        return
    p = _local_path(bucket, key)
    if p.exists():
        p.unlink()


def new_key(prefix: str, ext: str) -> str:
    return f"{prefix}/{uuid.uuid4().hex}.{ext}"


def retention_deadline(hours: int = 24) -> datetime:
    return datetime.utcnow() + timedelta(hours=hours)
