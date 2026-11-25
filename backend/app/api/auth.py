from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..rate_limit import check_auth_rate_limit
from ..schemas import (ChallengeResponse, ChangePasswordRequest, LoginRequest, MeResponse, OkResponse, RegisterRequest,
                       RegisterResponse, ResendOtpRequest, TokenResponse, VerifyOtpRequest)
from ..services import auth
from ..services.mailer import EmailSender
from .deps import CurrentUser, get_current_user, get_email_sender

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    check_auth_rate_limit(request, db, "register")
    return auth.register_student(db, **body.model_dump())


@router.post("/login", response_model=ChallengeResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db), sender: EmailSender = Depends(get_email_sender)):
    check_auth_rate_limit(request, db, "login")
    return auth.login_start(db, body.email, body.password, sender)


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(request: Request, body: VerifyOtpRequest, db: Session = Depends(get_db)):
    check_auth_rate_limit(request, db, "verify_otp")
    return auth.verify_otp(db, body.challenge_id, body.otp_code)


@router.post("/resend-otp", response_model=ChallengeResponse)
def resend_otp(request: Request, body: ResendOtpRequest, db: Session = Depends(get_db), sender: EmailSender = Depends(get_email_sender)):
    check_auth_rate_limit(request, db, "resend_otp")
    return auth.resend_otp(db, body.challenge_id, sender)


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser = Depends(get_current_user)):
    return MeResponse(account_id=user.account_id, email=user.email, full_name=user.full_name, role=user.role,
                      student_id=user.student_id, warden_id=user.warden_id, hostel_id=user.hostel_id)


@router.patch("/password", response_model=OkResponse)
def change_password(request: Request, body: ChangePasswordRequest, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    check_auth_rate_limit(request, db, "change_password")
    auth.change_password(db, user.account_id, user.role, body.current_password, body.new_password)
    return OkResponse()
