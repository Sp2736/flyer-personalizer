"""
Admin auth guard. Verifies the Supabase-issued JWT sent by the frontend
(after a normal supabase.auth.signInWithPassword() login) using Supabase's
JWKS endpoint — no shared secret to manage by hand.

DEV_BYPASS_AUTH=true skips verification entirely and injects a fake admin
identity, so local development and the existing dummy-frontend flow keep
working exactly as before. Never set this in production (Render env vars).
"""
from __future__ import annotations

import os
from fastapi import Header, HTTPException
import jwt
from jwt import PyJWKClient

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
DEV_BYPASS_AUTH = os.getenv("DEV_BYPASS_AUTH", "false").lower() == "true"

_jwks_client = None
if SUPABASE_URL and not DEV_BYPASS_AUTH:
    _jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")


async def require_admin(authorization: str = Header(default="")):
    """FastAPI dependency — add `admin=Depends(require_admin)` to any admin route."""
    if DEV_BYPASS_AUTH:
        return {"id": "dev-bypass", "email": "dev@local"}

    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    if not _jwks_client:
        raise HTTPException(500, "Auth not configured: SUPABASE_URL missing")

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token, signing_key.key, algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except Exception as e:
        raise HTTPException(401, f"Invalid or expired token: {e}")

    return {"id": payload["sub"], "email": payload.get("email")}
