from __future__ import annotations
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from ..core.db import get_db, CreditAccount

router = APIRouter(tags=["public"])


@router.get("/credits")
def get_credits(db: Session = Depends(get_db), x_college_id: str = Header(default="default")):
    college_id = x_college_id or "default"
    acct = db.query(CreditAccount).get(college_id)
    if not acct:
        acct = CreditAccount(college_id=college_id, remaining=10)
        db.add(acct)
        db.commit()
        db.refresh(acct)
    return {"remaining": acct.remaining}
