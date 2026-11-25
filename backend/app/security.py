"""Passwords, one-time codes and access tokens."""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from .config import settings
from .errors import DomainError

_hasher = PasswordHasher()
# Used to spend the same time when an email is unknown, so a login attempt does not reveal which emails exist.
_DUMMY_HASH = _hasher.hash(secrets.token_hex(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def burn_time(password: str) -> None:
    verify_password(_DUMMY_HASH, password)


# ---------------------------------------------------------------- one-time codes
def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(challenge_id: uuid.UUID, code: str) -> str:
    """Keyed hash of the code, so the table never holds a readable code."""
    return hmac.new(settings.jwt_secret.encode(), f"{challenge_id}:{code}".encode(), hashlib.sha256).hexdigest()


def otp_matches(challenge_id: uuid.UUID, code: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(challenge_id, code), stored_hash)


# ---------------------------------------------------------------- access tokens (HS256 JWT)
def create_access_token(*, account_id: uuid.UUID, role: str, student_id: uuid.UUID | None = None,
                        warden_id: uuid.UUID | None = None, hostel_id: uuid.UUID | None = None) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    claims = {"sub": str(account_id), "role": role, "iat": int(now.timestamp()),
              "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp())}
    for key, value in (("student_id", student_id), ("warden_id", warden_id), ("hostel_id", hostel_id)):
        if value is not None:
            claims[key] = str(value)
    return jwt.encode(claims, settings.jwt_secret, algorithm="HS256"), settings.jwt_expire_minutes * 60


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
    except jwt.ExpiredSignatureError as exc:
        raise DomainError(401, "UNAUTHENTICATED", "The token has expired. Please log in again.") from exc
    except jwt.PyJWTError as exc:
        raise DomainError(401, "UNAUTHENTICATED", "The token is not valid.") from exc
