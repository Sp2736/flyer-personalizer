from __future__ import annotations

import os
import uuid
from datetime import datetime

from sqlalchemy import create_engine, Column, String, DateTime, Boolean, JSON, ForeignKey, Integer
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_dev.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _uuid() -> str:
    return str(uuid.uuid4())


class Module(Base):
    __tablename__ = "modules"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Theme(Base):
    __tablename__ = "themes"
    id = Column(String, primary_key=True, default=_uuid)
    module_id = Column(String, ForeignKey("modules.id"), nullable=False)
    name = Column(String, nullable=False)
    marker_pdf_key = Column(String, nullable=False)
    clean_pdf_key = Column(String, nullable=False)
    thumbnail_key = Column(String, nullable=True)
    config_json = Column(JSON, nullable=False)
    default_paper_size = Column(String, default="A4")
    max_character_count = Column(Integer, default=1)
    status = Column(String, default="inactive")
    created_at = Column(DateTime, default=datetime.utcnow)


class Generation(Base):
    __tablename__ = "generations"
    id = Column(String, primary_key=True, default=_uuid)
    module_id = Column(String, ForeignKey("modules.id"), nullable=False)
    theme_id = Column(String, ForeignKey("themes.id"), nullable=False)
    college_id = Column(String, nullable=True)
    paper_size = Column(String, default="A4")
    character_count = Column(Integer, default=1)
    student_name = Column(String, nullable=True)
    school_name = Column(String, nullable=True)
    photo_storage_paths = Column(JSON, default=list)
    preview_key = Column(String, nullable=True)
    final_pdf_key = Column(String, nullable=True)
    final_png_key = Column(String, nullable=True)
    status = Column(String, default="previewed")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


class CreditAccount(Base):
    __tablename__ = "credit_accounts"
    college_id = Column(String, primary_key=True)
    remaining = Column(Integer, default=10)
    updated_at = Column(DateTime, default=datetime.utcnow)


class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    id = Column(String, primary_key=True, default=_uuid)
    generation_id = Column(String, ForeignKey("generations.id"), nullable=False)
    status = Column(String, default="queued")
    error = Column(String, nullable=True)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
