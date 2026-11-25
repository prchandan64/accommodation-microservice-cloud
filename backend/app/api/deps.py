import uuid
from dataclasses import dataclass

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..db import get_db
from ..errors import DomainError
from ..security import decode_token
from ..services import auth
from ..services.mailer import EmailSender, build_email_sender
from ..services.payments import MockPaymentGateway, PaymentGateway

bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    account_id: uuid.UUID
    email: str
    full_name: str
    role: str
    student_id: uuid.UUID | None
    warden_id: uuid.UUID | None
    hostel_id: uuid.UUID | None


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> CurrentUser:
    """Checks the token, then reads the account again so a suspended user is locked out immediately."""
    if creds is None:
        raise DomainError(401, "UNAUTHENTICATED", "Log in first and send the token as 'Authorization: Bearer <token>'.")
    claims = decode_token(creds.credentials)
    try:
        account_id = uuid.UUID(claims["sub"])
    except (ValueError, KeyError) as exc:
        raise DomainError(401, "UNAUTHENTICATED", "The token is not valid.") from exc
    row = auth.load_user(db, account_id)
    if row is None or row.role != claims.get("role"):
        raise DomainError(401, "UNAUTHENTICATED", "The token is not valid.")
    if row.account_status != "ACTIVE":
        raise DomainError(403, "ACCOUNT_SUSPENDED", "This account is not active. Contact the housing office.")
    return CurrentUser(row.account_id, row.email, row.full_name, row.role, row.student_id, row.warden_id, row.hostel_id)


def require_roles(*roles: str):
    """Dependency factory: only the listed roles may call the endpoint."""
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise DomainError(403, "FORBIDDEN_ROLE", f"This action needs the role {' or '.join(roles)}.")
        return user
    return dependency


def get_student_id(user: CurrentUser = Depends(require_roles("STUDENT"))) -> uuid.UUID:
    """The booking endpoints depend on this: the logged-in student's id."""
    if user.student_id is None:
        raise DomainError(403, "FORBIDDEN_ROLE", "This account has no student profile.")
    return user.student_id


def get_gateway() -> PaymentGateway:
    return MockPaymentGateway()


def get_email_sender() -> EmailSender:
    return build_email_sender()
