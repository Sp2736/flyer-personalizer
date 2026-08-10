from __future__ import annotations
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .core.db import init_db
from .core.cleanup import run_cleanup
from .routers import modules, themes, uploads, generate, credits, history, download

app = FastAPI(title="Flyer Personalizer API", version="2.0")
app.state.limiter = generate.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(modules.router)
app.include_router(themes.public_router)
app.include_router(themes.admin_router)
app.include_router(uploads.router)
app.include_router(generate.router)
app.include_router(credits.router)
app.include_router(history.router)
app.include_router(download.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/admin/cleanup")
def cleanup():
    return run_cleanup()
