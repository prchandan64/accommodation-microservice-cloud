"""Accounts, login with a 6-digit code, tokens, and staff account management.

Login is two steps: email + password sends a code, the code returns the access token.
Every failure uses the error codes from the API document.
"""
from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..errors import DomainError
from ..security import (burn_time, create_access_token, generate_otp, hash_otp, hash_password, otp_matches, verify_password)
from .mailer import EmailSender

log = logging.getLogger("accommodation.auth")


@dataclass
class UserRow:
    account_id: uuid.UUID
    email: str
    full_name: str
    role: str
    account_status: str
    student_id: uuid.UUID | None = None
    warden_id: uuid.UUID | None = None
    hostel_id: uuid.UUID | None = None


def _constraint_name(exc: IntegrityError) -> str | None:
    return getattr(getattr(exc.orig, "diag", None), "constraint_name", None)


def _norm(email: str) -> str:
    return email.strip().lower()


def audit(db: Session, actor_account_id: uuid.UUID | None, actor_role: str | None, action: str, entity_type: str,
          entity_id: uuid.UUID | None, details: dict | None = None) -> None:
    db.execute(
        text("""INSERT INTO audit_logs (actor_account_id, actor_role, action, entity_type, entity_id, details)
                VALUES (:actor, :role, :action, :etype, :eid, CAST(:details AS jsonb))"""),
        {"actor": actor_account_id, "role": actor_role, "action": action, "etype": entity_type, "eid": entity_id,
         "details": json.dumps(details or {}, default=str)},
    )


def load_user(db: Session, account_id: uuid.UUID) -> UserRow | None:
    """The account with its student or warden ids, read fresh on every request so a suspension takes effect at once."""
    row = db.execute(
        text("""SELECT a.account_id, a.email, a.full_name, a.role, a.account_status,
                       s.student_id, w.warden_id, w.hostel_id
                  FROM accommodation_auth_accounts a
                  LEFT JOIN students s ON s.account_id = a.account_id
                  LEFT JOIN wardens w  ON w.account_id = a.account_id
                 WHERE a.account_id = :id"""),
        {"id": account_id},
    ).mappings().one_or_none()
    return UserRow(**row) if row else None


# --------------------------------------------------------------------------- register
def register_student(db: Session, *, email: str, password: str, full_name: str, enrollment_no: str, gender: str,
                     course: str | None = None, year_of_study: int | None = None, phone: str | None = None) -> dict:
    """Students sign themselves up. The role is always STUDENT."""
    try:
        account_id = db.execute(
            text("""INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                    VALUES (:email, :hash, 'STUDENT', :name) RETURNING account_id"""),
            {"email": _norm(email), "hash": hash_password(password), "name": full_name.strip()},
        ).scalar_one()
        student_id = db.execute(
            text("""INSERT INTO students (account_id, enrollment_no, gender, course, year_of_study, phone)
                    VALUES (:acc, :en, :g, :course, :year, :phone) RETURNING student_id"""),
            {"acc": account_id, "en": enrollment_no.strip(), "g": gender, "course": course, "year": year_of_study, "phone": phone},
        ).scalar_one()
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        name = _constraint_name(exc) or ""
        if "email" in name:
            raise DomainError(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered.") from exc
        if "enrollment" in name:
            raise DomainError(409, "ENROLLMENT_ALREADY_REGISTERED", "This enrollment number is already registered.") from exc
        raise
    return {"account_id": account_id, "student_id": student_id, "email": _norm(email)}


# --------------------------------------------------------------------------- login step 1: password -> code
def _issue_challenge(db: Session, account_id: uuid.UUID, email: str, sender: EmailSender) -> uuid.UUID:
    code = generate_otp()
    challenge_id = uuid.uuid4()
    db.execute(
        text("""INSERT INTO email_otp_challenges (challenge_id, account_id, otp_hash, expires_at)
                VALUES (:id, :acc, :hash, now() + make_interval(secs => CAST(:ttl AS integer)))"""),
        {"id": challenge_id, "acc": account_id, "hash": hash_otp(challenge_id, code), "ttl": settings.otp_ttl_seconds},
    )
    db.commit()
    try:
        sender.send_otp(email, code, settings.otp_ttl_seconds // 60)
    except Exception as exc:                                   # the code is saved; the user can ask for another
        log.exception("could not send the login code")
        raise DomainError(502, "EMAIL_FAILED", "The login code could not be sent. Please try again.") from exc
    return challenge_id


def login_start(db: Session, email: str, password: str, sender: EmailSender) -> dict:
    row = db.execute(
        text("SELECT account_id, email, hashed_password, account_status FROM accommodation_auth_accounts WHERE email = :e"),
        {"e": _norm(email)},
    ).mappings().one_or_none()
    if row is None:
        burn_time(password)
        raise DomainError(401, "INVALID_CREDENTIALS", "Email or password is wrong.")
    if not verify_password(row["hashed_password"], password):
        raise DomainError(401, "INVALID_CREDENTIALS", "Email or password is wrong.")
    if row["account_status"] != "ACTIVE":
        raise DomainError(403, "ACCOUNT_SUSPENDED", "This account is not active. Contact the housing office.")
    challenge_id = _issue_challenge(db, row["account_id"], row["email"], sender)
    return {"challenge_id": challenge_id, "message": "A 6-digit code was sent to your email", "expires_in": settings.otp_ttl_seconds}


def resend_otp(db: Session, challenge_id: uuid.UUID, sender: EmailSender) -> dict:
    old = db.execute(
        text("""SELECT c.account_id, a.email, a.account_status,
                       EXISTS (SELECT 1 FROM email_otp_challenges r
                                WHERE r.account_id = c.account_id
                                  AND r.created_at > now() - make_interval(secs => CAST(:cool AS integer))) AS too_soon
                  FROM email_otp_challenges c
                  JOIN accommodation_auth_accounts a ON a.account_id = c.account_id
                 WHERE c.challenge_id = :id"""),
        {"id": challenge_id, "cool": settings.otp_resend_cooldown_seconds},
    ).mappings().one_or_none()
    if old is None:
        raise DomainError(401, "OTP_INVALID", "The login session was not found. Please log in again.")
    if old["account_status"] != "ACTIVE":
        raise DomainError(403, "ACCOUNT_SUSPENDED", "This account is not active. Contact the housing office.")
    if old["too_soon"]:
        raise DomainError(429, "RATE_LIMITED", "Please wait a moment before asking for another code.",
                          {"retry_after_seconds": settings.otp_resend_cooldown_seconds})
    db.execute(text("UPDATE email_otp_challenges SET is_used = TRUE WHERE account_id = :acc AND is_used = FALSE"), {"acc": old["account_id"]})
    new_id = _issue_challenge(db, old["account_id"], old["email"], sender)
    return {"challenge_id": new_id, "message": "A new 6-digit code was sent to your email", "expires_in": settings.otp_ttl_seconds}


# --------------------------------------------------------------------------- login step 2: code -> token
def verify_otp(db: Session, challenge_id: uuid.UUID, code: str) -> dict:
    ch = db.execute(
        text("""SELECT c.challenge_id, c.account_id, c.otp_hash, c.attempts, c.is_used,
                       (c.expires_at < now()) AS expired, a.account_status
                  FROM email_otp_challenges c
                  JOIN accommodation_auth_accounts a ON a.account_id = c.account_id
                 WHERE c.challenge_id = :id
                   FOR UPDATE OF c"""),
        {"id": challenge_id},
    ).mappings().one_or_none()
    if ch is None or ch["is_used"]:
        db.rollback()
        raise DomainError(401, "OTP_INVALID", "The code is not valid. Please log in again.")
    if ch["expired"]:
        db.rollback()
        raise DomainError(401, "OTP_EXPIRED", "The code has expired. Ask for a new one.")
    if ch["attempts"] >= settings.otp_max_attempts:
        db.rollback()
        raise DomainError(429, "OTP_ATTEMPTS_EXCEEDED", "Too many wrong codes. Ask for a new code.")
    if ch["account_status"] != "ACTIVE":
        db.rollback()
        raise DomainError(403, "ACCOUNT_SUSPENDED", "This account is not active. Contact the housing office.")

    if not otp_matches(challenge_id, code.strip(), ch["otp_hash"]):
        attempts = ch["attempts"] + 1
        db.execute(text("UPDATE email_otp_challenges SET attempts = :n WHERE challenge_id = :id"), {"n": attempts, "id": challenge_id})
        db.commit()                                              # the wrong guess must be counted
        if attempts >= settings.otp_max_attempts:
            raise DomainError(429, "OTP_ATTEMPTS_EXCEEDED", "Too many wrong codes. Ask for a new code.")
        raise DomainError(401, "OTP_INVALID", "The code is not correct.", {"attempts_left": settings.otp_max_attempts - attempts})

    db.execute(text("UPDATE email_otp_challenges SET is_used = TRUE WHERE challenge_id = :id"), {"id": challenge_id})
    db.execute(text("UPDATE accommodation_auth_accounts SET last_login_at = now() WHERE account_id = :id"), {"id": ch["account_id"]})
    user = load_user(db, ch["account_id"])
    db.commit()
    token, expires_in = create_access_token(account_id=user.account_id, role=user.role, student_id=user.student_id,
                                            warden_id=user.warden_id, hostel_id=user.hostel_id)
    return {"access_token": token, "token_type": "bearer", "expires_in": expires_in, "role": user.role}


# --------------------------------------------------------------------------- password change
def change_password(db: Session, account_id: uuid.UUID, role: str, current_password: str, new_password: str) -> None:
    row = db.execute(text("SELECT hashed_password FROM accommodation_auth_accounts WHERE account_id = :id"), {"id": account_id}).mappings().one()
    if not verify_password(row["hashed_password"], current_password):
        raise DomainError(401, "INVALID_CREDENTIALS", "The current password is wrong.")
    db.execute(text("UPDATE accommodation_auth_accounts SET hashed_password = :h WHERE account_id = :id"),
               {"h": hash_password(new_password), "id": account_id})
    audit(db, account_id, role, "PASSWORD_CHANGED", "accommodation_auth_accounts", account_id)
    db.commit()


# --------------------------------------------------------------------------- staff accounts (housing admin)
def create_staff_account(db: Session, actor: UserRow | None, *, email: str, full_name: str, role: str, password: str,
                         hostel_id: uuid.UUID | None = None, employee_code: str | None = None, phone: str | None = None) -> dict:
    if role not in ("WARDEN", "HOUSING_ADMIN"):
        raise DomainError(422, "VALIDATION_ERROR", "Role must be WARDEN or HOUSING_ADMIN.")
    if role == "WARDEN" and (hostel_id is None or not employee_code):
        raise DomainError(422, "VALIDATION_ERROR", "A warden needs hostel_id and employee_code.")
    try:
        account_id = db.execute(
            text("""INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                    VALUES (:email, :hash, :role, :name) RETURNING account_id"""),
            {"email": _norm(email), "hash": hash_password(password), "role": role, "name": full_name.strip()},
        ).scalar_one()
        warden_id = None
        if role == "WARDEN":
            warden_id = db.execute(
                text("""INSERT INTO wardens (account_id, hostel_id, employee_code, phone)
                        VALUES (:acc, :h, :code, :phone) RETURNING warden_id"""),
                {"acc": account_id, "h": hostel_id, "code": employee_code, "phone": phone},
            ).scalar_one()
        audit(db, actor.account_id if actor else None, actor.role if actor else None, "ACCOUNT_CREATED",
              "accommodation_auth_accounts", account_id, {"role": role, "email": _norm(email)})
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        name = _constraint_name(exc) or ""
        if "email" in name:
            raise DomainError(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered.") from exc
        if "employee_code" in name:
            raise DomainError(409, "EMPLOYEE_CODE_TAKEN", "This employee code is already used.") from exc
        if "hostel" in name:
            raise DomainError(404, "NOT_FOUND", "Hostel not found.") from exc
        raise
    return {"account_id": account_id, "warden_id": warden_id, "role": role, "email": _norm(email)}


def set_account_status(db: Session, actor: UserRow, account_id: uuid.UUID, new_status: str) -> dict:
    if new_status not in ("ACTIVE", "SUSPENDED"):
        raise DomainError(422, "VALIDATION_ERROR", "Status must be ACTIVE or SUSPENDED.")
    if account_id == actor.account_id:
        raise DomainError(409, "INVALID_STATE", "You cannot change the status of your own account.")
    changed = db.execute(
        text("UPDATE accommodation_auth_accounts SET account_status = :s WHERE account_id = :id"), {"s": new_status, "id": account_id}
    ).rowcount
    if changed == 0:
        db.rollback()
        raise DomainError(404, "NOT_FOUND", "Account not found.")
    audit(db, actor.account_id, actor.role, "ACCOUNT_STATUS_CHANGED", "accommodation_auth_accounts", account_id, {"status": new_status})
    db.commit()
    return {"account_id": account_id, "account_status": new_status}
