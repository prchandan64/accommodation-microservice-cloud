import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import (AllocationOut, AmountDue, ApplicationOut, ApplyRequest, ApplyResponse, AvailabilityResponse,
                       CancelRequest, CancelResponse, PayRequest, PayResponse, PaymentOut)
from ..services import booking
from ..services.payments import PaymentGateway
from .deps import get_gateway, get_student_id

router = APIRouter()


@router.get("/availability", response_model=AvailabilityResponse)
def availability(term_id: uuid.UUID | None = None, hostel_id: uuid.UUID | None = None, room_type_id: uuid.UUID | None = None,
                 student_id: uuid.UUID = Depends(get_student_id), db: Session = Depends(get_db)):
    return {"items": booking.get_availability(db, student_id, term_id, hostel_id, room_type_id)}


@router.post("/applications", response_model=ApplyResponse, status_code=201)
def apply_and_hold(body: ApplyRequest, student_id: uuid.UUID = Depends(get_student_id), db: Session = Depends(get_db)):
    r = booking.hold_bed(db, student_id, body.inventory_id, body.remarks)
    return ApplyResponse(application_id=r.application_id, status=r.status, hold_expires_at=r.hold_expires_at,
                         amount_due=AmountDue(rent=r.rent, deposit=r.deposit, total=r.total, currency=r.currency))


@router.get("/applications/{application_id}", response_model=ApplicationOut)
def read_application(application_id: uuid.UUID, student_id: uuid.UUID = Depends(get_student_id), db: Session = Depends(get_db)):
    a = booking.get_application(db, student_id, application_id)
    rent, deposit = a["rent_amount"], a["deposit_amount"]
    alloc = a["allocation"]
    return ApplicationOut(
        application_id=a["application_id"], status=a["status"], hold_expires_at=a["hold_expires_at"], status_reason=a["status_reason"],
        applied_at=a["applied_at"], amount_due=AmountDue(rent=rent, deposit=deposit, total=rent + deposit, currency=a["currency"]),
        allocation=AllocationOut(allocation_id=alloc.allocation_id, allotment_pass_code=alloc.allotment_pass_code,
                                 start_date=alloc.start_date, end_date=alloc.end_date) if alloc else None)


@router.post("/applications/{application_id}/pay", response_model=PayResponse)
def pay(application_id: uuid.UUID, body: PayRequest, student_id: uuid.UUID = Depends(get_student_id),
        db: Session = Depends(get_db), gateway: PaymentGateway = Depends(get_gateway)):
    r = booking.pay_application(db, student_id, application_id, body.payment_token, gateway)
    a = r.allocation
    return PayResponse(application_id=r.application_id, status=r.status,
                       allocation=AllocationOut(allocation_id=a.allocation_id, allotment_pass_code=a.allotment_pass_code,
                                                start_date=a.start_date, end_date=a.end_date),
                       payments=[PaymentOut(**p) for p in r.payments])


@router.post("/applications/{application_id}/cancel", response_model=CancelResponse)
def cancel(application_id: uuid.UUID, body: CancelRequest | None = None, student_id: uuid.UUID = Depends(get_student_id),
           db: Session = Depends(get_db)):
    r = booking.cancel_application(db, student_id, application_id, body.reason if body else None)
    return CancelResponse(application_id=r.application_id, status=r.status, refund_initiated=r.refund_initiated)
