import uuid
from datetime import date, datetime
from decimal import Decimal

from typing import Literal

from pydantic import BaseModel, Field


class ApplyRequest(BaseModel):
    inventory_id: uuid.UUID
    remarks: str | None = Field(default=None, max_length=1000)


class AmountDue(BaseModel):
    rent: Decimal
    deposit: Decimal
    total: Decimal
    currency: str


class ApplyResponse(BaseModel):
    application_id: uuid.UUID
    status: str
    hold_expires_at: datetime
    amount_due: AmountDue


class PayRequest(BaseModel):
    payment_token: str = Field(min_length=1, max_length=200)


class AllocationOut(BaseModel):
    allocation_id: uuid.UUID
    allotment_pass_code: str
    start_date: date
    end_date: date


class PaymentOut(BaseModel):
    fee_type: str
    amount: Decimal
    status: str


class PayResponse(BaseModel):
    application_id: uuid.UUID
    status: str
    allocation: AllocationOut
    payments: list[PaymentOut]


class CancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255)


class CancelResponse(BaseModel):
    application_id: uuid.UUID
    status: str
    refund_initiated: bool


class ApplicationOut(BaseModel):
    application_id: uuid.UUID
    status: str
    hold_expires_at: datetime | None
    status_reason: str | None
    applied_at: datetime
    amount_due: AmountDue
    allocation: AllocationOut | None = None


class AvailabilityItem(BaseModel):
    inventory_id: uuid.UUID
    term_id: uuid.UUID
    hostel_id: uuid.UUID
    hostel_name: str
    room_type_id: uuid.UUID
    room_type_name: str
    is_ac: bool
    has_attached_bathroom: bool
    beds_available: int
    rent_amount: Decimal
    deposit_amount: Decimal
    currency: str


class AvailabilityResponse(BaseModel):
    items: list[AvailabilityItem]


# ----------------------------------------------------------------------------- login and accounts
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    enrollment_no: str = Field(min_length=1, max_length=30)
    gender: Literal["MALE", "FEMALE", "OTHER"]
    course: str | None = Field(default=None, max_length=100)
    year_of_study: int | None = Field(default=None, ge=1, le=6)
    phone: str | None = Field(default=None, max_length=20)


class RegisterResponse(BaseModel):
    account_id: uuid.UUID
    student_id: uuid.UUID
    email: str


class LoginRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class ChallengeResponse(BaseModel):
    challenge_id: uuid.UUID
    message: str
    expires_in: int


class VerifyOtpRequest(BaseModel):
    challenge_id: uuid.UUID
    otp_code: str = Field(pattern=r"^\d{6}$")


class ResendOtpRequest(BaseModel):
    challenge_id: uuid.UUID


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    role: str


class MeResponse(BaseModel):
    account_id: uuid.UUID
    email: str
    full_name: str
    role: str
    student_id: uuid.UUID | None = None
    warden_id: uuid.UUID | None = None
    hostel_id: uuid.UUID | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class OkResponse(BaseModel):
    status: str = "ok"


class CreateStaffRequest(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=255)
    full_name: str = Field(min_length=1, max_length=120)
    role: Literal["WARDEN", "HOUSING_ADMIN"]
    password: str = Field(min_length=8, max_length=128)
    hostel_id: uuid.UUID | None = None
    employee_code: str | None = Field(default=None, max_length=20)
    phone: str | None = Field(default=None, max_length=20)


class CreateStaffResponse(BaseModel):
    account_id: uuid.UUID
    warden_id: uuid.UUID | None
    role: str
    email: str


class SetStatusRequest(BaseModel):
    account_status: Literal["ACTIVE", "SUSPENDED"]


class SetStatusResponse(BaseModel):
    account_id: uuid.UUID
    account_status: str
