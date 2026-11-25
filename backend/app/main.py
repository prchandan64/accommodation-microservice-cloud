import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .api import admin as admin_api
from .api import auth as auth_api
from .api import booking as booking_api
from .api import catalogue as catalogue_api
from .api import operations as operations_api
from .config import settings
from .db import SessionLocal
from .errors import DomainError
from .services import booking

log = logging.getLogger("accommodation")


def _run_expiry() -> int:
    with SessionLocal() as db:
        return booking.expire_holds(db)


async def _expiry_loop() -> None:
    """Every EXPIRY_JOB_SECONDS: release beds whose hold time has run out."""
    while True:
        await asyncio.sleep(settings.expiry_job_seconds)
        try:
            released = await asyncio.to_thread(_run_expiry)
            if released:
                log.info("released %s expired bed holds", released)
        except Exception:  # the loop must never die
            log.exception("expire_holds failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment != "dev":
        if (
            not settings.jwt_secret
            or settings.jwt_secret == "change-me-in-production"
            or len(settings.jwt_secret) < 32
        ):
            raise RuntimeError("Set a strong JWT_SECRET (at least 32 characters) before running outside development")
        if settings.email_backend == "console":
            raise RuntimeError("Console email_backend is not allowed outside development; configure SMTP")
        if settings.email_backend == "smtp" and (not settings.smtp_host or not settings.smtp_from):
            raise RuntimeError("SMTP_HOST and SMTP_FROM must be configured when EMAIL_BACKEND=smtp outside development")
    task = asyncio.create_task(_expiry_loop())
    yield
    task.cancel()


app = FastAPI(
    title="Accommodation Microservice",
    version="1.0.0",
    description="Student Mobility & Lifestyle Platform — Hostels & Housing Microservice with AWS RDS support",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError):
    headers = {}
    if exc.status_code == 429 and isinstance(exc.details, dict) and "retry_after_seconds" in exc.details:
        headers["Retry-After"] = str(exc.details["retry_after_seconds"])
    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = {".".join(str(p) for p in e["loc"] if p != "body"): e["msg"] for e in exc.errors()}
    return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Some fields are missing or invalid.", "details": details}})


@app.get(f"{settings.api_prefix}/health")
def health():
    return {
        "status": "healthy",
        "service": "Accommodation Microservice",
        "platform": "Student Mobility & Lifestyle Platform",
        "database": "PostgreSQL (AWS RDS compatible)",
        "currency": "INR"
    }


@app.get(f"{settings.api_prefix}/ready")
def ready():
    try:
        with SessionLocal() as db:
            ok = db.execute(
                text(
                    """SELECT 1
                         WHERE to_regclass('public.accommodation_auth_accounts') IS NOT NULL
                           AND to_regclass('public.bed_inventory') IS NOT NULL"""
                )
            ).scalar_one_or_none()
        if ok != 1:
            return JSONResponse(status_code=503, content={"status": "not_ready", "database": "schema_missing"})
        return {"status": "ready", "database": "connected"}
    except Exception:
        log.warning("Readiness check failed: database unavailable")
        return JSONResponse(status_code=503, content={"status": "not_ready", "database": "unavailable"})


# Include all sub-routers under API prefix (/api/v1/accommodation)
app.include_router(auth_api.router, prefix=settings.api_prefix)
app.include_router(booking_api.router, prefix=settings.api_prefix)
app.include_router(catalogue_api.router, prefix=settings.api_prefix)
app.include_router(operations_api.router, prefix=settings.api_prefix)
app.include_router(admin_api.router, prefix=settings.api_prefix)
