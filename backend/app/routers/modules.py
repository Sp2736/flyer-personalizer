from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.db import get_db, Module

router = APIRouter(tags=["public"])


@router.get("/modules")
def list_modules(db: Session = Depends(get_db)):
    mods = db.query(Module).order_by(Module.created_at).all()
    return [{"id": m.id, "name": m.name, "enabled": m.enabled} for m in mods]
