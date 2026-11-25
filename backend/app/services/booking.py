"""The bed booking engine: hold, pay, allocate, cancel, expire.

Rules this module relies on (all enforced by the database, see sql/schema.sql):
  * bed_inventory: beds_total = beds_available + beds_held + beds_allocated, no counter below zero
  * allocations:   one bed is never given to two students on overlapping dates (alloc_no_bed_overlap)
  * partial unique indexes: one live application per student and term, one live bed per student,
    one live charge per fee and application

Every public function takes a SQLAlchemy Session, commits its own work and raises DomainError
for expected problems. Counter changes and status changes always happen in the same transaction.
"""
from __future__ import annotations

import json
import logging
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..errors import DomainError
from .payments import PaymentGateway

log = logging.getLogger(__name__)
MAX_BED_ATTEMPTS = 5


# --------------------------------------------------------------------------- result objects
@dataclass
class HoldResult:
    application_id: uuid.UUID
    status: str
    hold_expires_at: datetime
    rent: Decimal
    deposit: Decimal
    currency: str

    @property
    def total(self) -> Decimal:
        return self.rent + self.deposit


@dataclass
class AllocationResult:
    allocation_id: uuid.UUID
    allotment_pass_code: str
    bed_id: uuid.UUID
    start_date: date
    end_date: date


@dataclass
class PayResult:
    application_id: uuid.UUID
    status: str
    allocation: AllocationResult
    payments: list[dict] = field(default_factory=list)


@dataclass
class CancelResult:
    application_id: uuid.UUID
    status: str
    refund_initiated: bool


# --------------------------------------------------------------------------- helpers
def _constraint_name(exc: IntegrityError) -> str | None:
    diag = getattr(exc.orig, "diag", None)
    return getattr(diag, "constraint_name", None)


def _add_outbox(db: Session, aggregate_type: str, aggregate_id: uuid.UUID, event_type: str, payload: dict) -> None:
    db.execute(
        text(
            """INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
               VALUES (:agg_type, :agg_id, :event_type, CAST(:payload AS jsonb))"""
        ),
        {"agg_type": aggregate_type, "agg_id": aggregate_id, "event_type": event_type, "payload": json.dumps(payload, default=str)},
    )


def _release_hold(db: Session, application_id: uuid.UUID, inventory_id: uuid.UUID, new_status: str, reason: str) -> None:
    """HELD -> EXPIRED/FAILED/CANCELLED and give the bed back. Does nothing if the sweeper already did it."""
    changed = db.execute(
        text(
            """UPDATE hostel_applications
                  SET status = :status, decided_at = now(), status_reason = :reason
                WHERE application_id = :id AND status = 'HELD'"""
        ),
        {"status": new_status, "reason": reason, "id": application_id},
    ).rowcount
    if changed == 1:
        db.execute(
            text(
                """UPDATE bed_inventory
                      SET beds_held = beds_held - 1, beds_available = beds_available + 1, version = version + 1
                    WHERE inventory_id = :inv AND beds_held >= 1"""
            ),
            {"inv": inventory_id},
        )


def _existing_allocation(db: Session, application_id: uuid.UUID) -> AllocationResult | None:
    row = db.execute(
        text(
            """SELECT allocation_id, allotment_pass_code, bed_id, start_date, end_date
                 FROM allocations WHERE application_id = :id"""
        ),
        {"id": application_id},
    ).mappings().one_or_none()
    return AllocationResult(**row) if row else None


# --------------------------------------------------------------------------- availability
def get_availability(db: Session, student_id: uuid.UUID | None = None, term_id: uuid.UUID | None = None,
                     hostel_id: uuid.UUID | None = None, room_type_id: uuid.UUID | None = None) -> list[dict]:
    """Beds still free for terms that are open, with fees. Students only see hostels that match their gender."""
    rows = db.execute(
        text(
            """SELECT i.inventory_id, i.term_id, h.hostel_id, h.name AS hostel_name, rt.room_type_id, rt.name AS room_type_name,
                      rt.is_ac, rt.has_attached_bathroom, i.beds_available, f.rent_amount, f.deposit_amount, f.currency
                 FROM bed_inventory i
                 JOIN hostels h        ON h.hostel_id = i.hostel_id
                 JOIN room_types rt    ON rt.room_type_id = i.room_type_id
                 JOIN academic_terms t ON t.term_id = i.term_id
                 JOIN fee_schedules f  ON f.term_id = i.term_id AND f.room_type_id = i.room_type_id
                 LEFT JOIN students s  ON s.student_id = :student_id
                WHERE t.status = 'OPEN' AND h.status = 'ACTIVE' AND i.beds_available > 0
                  AND (CAST(:student_id AS uuid) IS NULL OR h.gender_policy = 'MIXED' OR h.gender_policy = s.gender)
                  AND (CAST(:term_id AS uuid) IS NULL OR i.term_id = :term_id)
                  AND (CAST(:hostel_id AS uuid) IS NULL OR i.hostel_id = :hostel_id)
                  AND (CAST(:room_type_id AS uuid) IS NULL OR i.room_type_id = :room_type_id)
                ORDER BY h.name, rt.name"""
        ),
        {"student_id": student_id, "term_id": term_id, "hostel_id": hostel_id, "room_type_id": room_type_id},
    ).mappings().all()
    return [dict(r) for r in rows]


# --------------------------------------------------------------------------- step 1: apply and hold
def hold_bed(db: Session, student_id: uuid.UUID, inventory_id: uuid.UUID, remarks: str | None = None,
             hold_minutes: int | None = None) -> HoldResult:
    """APPLIED -> HELD in ONE transaction: take one bed from the inventory and start the hold timer."""
    minutes = hold_minutes or settings.hold_minutes
    info = db.execute(
        text(
            """SELECT i.term_id, h.status AS hostel_status, h.gender_policy, t.status AS term_status,
                      (now() >= t.applications_open_at AND now() < t.applications_close_at) AS window_open,
                      s.gender, f.rent_amount, f.deposit_amount, f.currency
                 FROM bed_inventory i
                 JOIN hostels h        ON h.hostel_id = i.hostel_id
                 JOIN academic_terms t ON t.term_id = i.term_id
                 JOIN students s       ON s.student_id = :student_id
                 LEFT JOIN fee_schedules f ON f.term_id = i.term_id AND f.room_type_id = i.room_type_id
                WHERE i.inventory_id = :inventory_id"""
        ),
        {"student_id": student_id, "inventory_id": inventory_id},
    ).mappings().one_or_none()
    if info is None:
        raise DomainError(404, "NOT_FOUND", "Student or bed inventory not found.")
    if info["hostel_status"] != "ACTIVE":
        raise DomainError(409, "INVALID_STATE", "This hostel is not taking applications.")
    if info["term_status"] != "OPEN" or not info["window_open"]:
        raise DomainError(422, "TERM_NOT_OPEN", "Applications are closed for this term.")
    if info["gender_policy"] != "MIXED" and info["gender_policy"] != info["gender"]:
        raise DomainError(403, "GENDER_POLICY_MISMATCH", "This hostel does not accept your gender policy.")
    if info["rent_amount"] is None:
        raise DomainError(422, "FEE_NOT_CONFIGURED", "No fee is set for this room type and term.")

    # 1. record the request (the partial unique index refuses a second live application for the term)
    try:
        with db.begin_nested():
            application_id = db.execute(
                text(
                    """INSERT INTO hostel_applications (student_id, term_id, inventory_id, status, remarks)
                       VALUES (:student_id, :term_id, :inventory_id, 'APPLIED', :remarks)
                       RETURNING application_id"""
                ),
                {"student_id": student_id, "term_id": info["term_id"], "inventory_id": inventory_id, "remarks": remarks},
            ).scalar_one()
    except IntegrityError as exc:
        if _constraint_name(exc) == "uq_application_student_term_live":
            raise DomainError(409, "ALREADY_APPLIED", "You already have an application for this term.") from exc
        raise

    # 2. atomic hold: the WHERE clause is what stops two students taking the last bed
    taken = db.execute(
        text(
            """UPDATE bed_inventory
                  SET beds_available = beds_available - 1, beds_held = beds_held + 1, version = version + 1
                WHERE inventory_id = :inventory_id AND beds_available >= 1"""
        ),
        {"inventory_id": inventory_id},
    ).rowcount
    if taken == 0:
        db.execute(
            text(
                """UPDATE hostel_applications
                      SET status = 'REJECTED', decided_at = now(), status_reason = 'No beds available'
                    WHERE application_id = :id"""
            ),
            {"id": application_id},
        )
        db.commit()  # keep the REJECTED record
        raise DomainError(409, "NO_BEDS_AVAILABLE", "No beds left in this hostel and room type.")

    expires_at = db.execute(
        text(
            """UPDATE hostel_applications
                  SET status = 'HELD', hold_expires_at = now() + make_interval(mins => CAST(:minutes AS integer))
                WHERE application_id = :id AND status = 'APPLIED'
            RETURNING hold_expires_at"""
        ),
        {"minutes": minutes, "id": application_id},
    ).scalar_one()
    db.commit()
    return HoldResult(application_id, "HELD", expires_at, info["rent_amount"], info["deposit_amount"], info["currency"])


# --------------------------------------------------------------------------- step 2: allocate a real bed
_FIND_BED = text(
    """SELECT b.bed_id
         FROM beds b
         JOIN rooms r         ON r.room_id = b.room_id
         JOIN blocks bl       ON bl.block_id = r.block_id
         JOIN bed_inventory i ON i.hostel_id = bl.hostel_id AND i.room_type_id = r.room_type_id
        WHERE i.inventory_id = :inventory_id
          AND b.status = 'ACTIVE' AND r.status = 'AVAILABLE' AND bl.status = 'ACTIVE'
          AND NOT EXISTS (SELECT 1 FROM allocations a
                           WHERE a.bed_id = b.bed_id
                             AND a.status IN ('ALLOCATED', 'CHECKED_IN')
                             AND daterange(a.start_date, a.end_date, '[]') && daterange(:start_date, :end_date, '[]'))
        ORDER BY bl.block_code, r.room_number, b.bed_label
        LIMIT 1
        FOR UPDATE OF b SKIP LOCKED"""
)


def _allocate(db: Session, application_id: uuid.UUID) -> AllocationResult:
    """HELD -> ALLOCATED inside the caller's transaction. Does not commit."""
    app = db.execute(
        text(
            """SELECT a.application_id, a.student_id, a.status, a.inventory_id, a.term_id,
                      (a.hold_expires_at IS NOT NULL AND a.hold_expires_at < now()) AS expired,
                      t.start_date, t.end_date, i.hostel_id
                 FROM hostel_applications a
                 JOIN academic_terms t ON t.term_id = a.term_id
                 JOIN bed_inventory i  ON i.inventory_id = a.inventory_id
                WHERE a.application_id = :id
                  FOR UPDATE OF a"""
        ),
        {"id": application_id},
    ).mappings().one_or_none()
    if app is None:
        raise DomainError(404, "NOT_FOUND", "Application not found.")
    if app["status"] == "ALLOCATED":
        existing = _existing_allocation(db, application_id)
        if existing:
            return existing
    if app["status"] != "HELD":
        raise DomainError(409, "INVALID_STATE", f"Cannot allocate a bed for an application that is {app['status']}.")
    if app["expired"]:
        raise DomainError(409, "HOLD_EXPIRED", "The hold time has passed. Please apply again.")

    allocation = None
    for _ in range(MAX_BED_ATTEMPTS):
        bed_id = db.execute(_FIND_BED, {"inventory_id": app["inventory_id"], "start_date": app["start_date"], "end_date": app["end_date"]}).scalar_one_or_none()
        if bed_id is None:
            raise DomainError(409, "NO_BEDS_AVAILABLE", "No free bed could be assigned.")
        pass_code = f"ALP-{app['start_date'].year}-{secrets.token_hex(4).upper()}"
        try:
            with db.begin_nested():
                allocation = db.execute(
                    text(
                        """INSERT INTO allocations (application_id, student_id, bed_id, start_date, end_date, allotment_pass_code)
                           VALUES (:application_id, :student_id, :bed_id, :start_date, :end_date, :pass_code)
                        RETURNING allocation_id, allotment_pass_code, bed_id, start_date, end_date"""
                    ),
                    {"application_id": application_id, "student_id": app["student_id"], "bed_id": bed_id,
                     "start_date": app["start_date"], "end_date": app["end_date"], "pass_code": pass_code},
                ).mappings().one()
            break
        except IntegrityError as exc:
            name = _constraint_name(exc)
            if name == "uq_alloc_student_live":
                raise DomainError(409, "INVALID_STATE", "The student already holds a bed.") from exc
            if name in ("alloc_no_bed_overlap", "allocations_allotment_pass_code_key"):
                continue  # bed or pass code was taken meanwhile: pick again
            raise
    if allocation is None:
        raise DomainError(409, "BED_CONFLICT", "Could not assign a free bed. Please try again.")

    db.execute(
        text("UPDATE hostel_applications SET status = 'ALLOCATED', decided_at = now() WHERE application_id = :id AND status = 'HELD'"),
        {"id": application_id},
    )
    moved = db.execute(
        text(
            """UPDATE bed_inventory
                  SET beds_held = beds_held - 1, beds_allocated = beds_allocated + 1, version = version + 1
                WHERE inventory_id = :inv AND beds_held >= 1"""
        ),
        {"inv": app["inventory_id"]},
    ).rowcount
    if moved != 1:
        raise RuntimeError("bed_inventory counters are out of step with the application (beds_held was 0)")

    hostel = db.execute(
        text("SELECT hostel_id, name, latitude, longitude FROM hostels WHERE hostel_id = :id"), {"id": app["hostel_id"]}
    ).mappings().one()
    _add_outbox(db, "ALLOCATION", allocation["allocation_id"], "accommodation.allocation.confirmed", {
        "allocation_id": allocation["allocation_id"], "application_id": application_id, "student_id": app["student_id"],
        "bed_id": allocation["bed_id"], "start_date": allocation["start_date"], "end_date": allocation["end_date"],
        "hostel": {"hostel_id": hostel["hostel_id"], "name": hostel["name"], "latitude": hostel["latitude"], "longitude": hostel["longitude"]},
    })
    return AllocationResult(**allocation)


def pay_application(db: Session, student_id: uuid.UUID, application_id: uuid.UUID, payment_token: str,
                    gateway: PaymentGateway) -> PayResult:
    """Charge rent + deposit, then allocate a bed. Calling it again after success returns the same allocation."""
    app = db.execute(
        text(
            """SELECT a.application_id, a.student_id, a.status, a.inventory_id,
                      (a.hold_expires_at IS NOT NULL AND a.hold_expires_at < now()) AS expired,
                      f.rent_amount, f.deposit_amount, COALESCE(f.currency, 'INR') AS currency
                 FROM hostel_applications a
                 JOIN bed_inventory i ON i.inventory_id = a.inventory_id
                 LEFT JOIN fee_schedules f ON f.term_id = a.term_id AND f.room_type_id = i.room_type_id
                WHERE a.application_id = :id
                  FOR UPDATE OF a"""
        ),
        {"id": application_id},
    ).mappings().one_or_none()
    if app is None or app["student_id"] != student_id:
        raise DomainError(404, "NOT_FOUND", "Application not found.")
    if app["status"] == "ALLOCATED":                       # safe retry
        db.rollback()
        return _pay_result(db, application_id)
    if app["status"] != "HELD":
        raise DomainError(409, "INVALID_STATE", f"Cannot pay for an application that is {app['status']}.")
    if app["expired"]:
        _release_hold(db, application_id, app["inventory_id"], "EXPIRED", "Hold time ran out")
        db.commit()
        raise DomainError(409, "HOLD_EXPIRED", "The hold time has passed. Please apply again.")

    charges = [(fee, amt) for fee, amt in (("RENT", app["rent_amount"]), ("DEPOSIT", app["deposit_amount"])) if amt and amt > 0]
    total = sum((amt for _, amt in charges), Decimal("0.00"))

    # Transaction A: record the charges as PENDING. The partial unique index stops a second concurrent charge.
    try:
        with db.begin_nested():
            for fee, amt in charges:
                db.execute(
                    text(
                        """INSERT INTO payment_records (application_id, student_id, fee_type, amount, currency, status)
                           VALUES (:app, :student, :fee, :amount, :currency, 'PENDING')"""
                    ),
                    {"app": application_id, "student": student_id, "fee": fee, "amount": amt, "currency": app["currency"]},
                )
    except IntegrityError as exc:
        db.rollback()
        raise DomainError(409, "INVALID_STATE", "A payment for this application is already in progress.") from exc
    db.commit()

    # The gateway is called outside any database transaction.
    result = gateway.charge(total, app["currency"], payment_token) if total > 0 else None

    if result is not None and not result.success:
        _release_hold(db, application_id, app["inventory_id"], "FAILED", (result.error or "Payment failed")[:255])
        db.execute(
            text("UPDATE payment_records SET status = 'FAILED', failure_reason = :r WHERE application_id = :id AND status = 'PENDING'"),
            {"r": (result.error or "Payment failed")[:255], "id": application_id},
        )
        db.commit()
        raise DomainError(402, "PAYMENT_FAILED", "The payment failed. The bed was released.", {"reason": result.error})

    # Transaction B: lock hostel_applications first (via _allocate) before updating payment_records to prevent lock-inversion deadlocks.
    try:
        _allocate(db, application_id)
        if result is not None:
            for fee, _ in charges:
                db.execute(
                    text(
                        """UPDATE payment_records
                              SET status = 'SUCCESS', paid_at = now(), transaction_reference = :ref
                            WHERE application_id = :id AND fee_type = :fee AND status = 'PENDING'"""
                    ),
                    {"ref": f"{result.reference}-{fee}", "id": application_id, "fee": fee},
                )
        db.commit()
    except DomainError as exc:
        db.rollback()
        # Money was taken but no bed could be given (for example the hold expired a moment ago): refund it.
        _release_hold(db, application_id, app["inventory_id"], "EXPIRED" if exc.code == "HOLD_EXPIRED" else "FAILED", exc.message[:255])
        if result is not None:
            gateway.refund(result.reference, total)
            db.execute(
                text("UPDATE payment_records SET status = 'REFUNDED' WHERE application_id = :id AND fee_type IN ('RENT', 'DEPOSIT') AND status = 'PENDING'"),
                {"id": application_id},
            )
        db.commit()
        raise
    except Exception:
        db.rollback()
        raise
    return _pay_result(db, application_id)


def _pay_result(db: Session, application_id: uuid.UUID) -> PayResult:
    allocation = _existing_allocation(db, application_id)
    if allocation is None:
        raise DomainError(409, "INVALID_STATE", "No allocation exists for this application.")
    payments = db.execute(
        text("SELECT fee_type, amount, status FROM payment_records WHERE application_id = :id AND fee_type IN ('RENT', 'DEPOSIT') ORDER BY fee_type DESC"),
        {"id": application_id},
    ).mappings().all()
    return PayResult(application_id, "ALLOCATED", allocation, [dict(p) for p in payments])


# --------------------------------------------------------------------------- cancel
def cancel_application(db: Session, student_id: uuid.UUID, application_id: uuid.UUID, reason: str | None = None) -> CancelResult:
    """Cancel a HELD or ALLOCATED application and give the bed back. A refund is requested if money was paid.

    Refund policy is an open decision: this asks for the full rent + deposit back.
    """
    app = db.execute(
        text(
            """SELECT application_id, student_id, status, inventory_id
                 FROM hostel_applications WHERE application_id = :id FOR UPDATE"""
        ),
        {"id": application_id},
    ).mappings().one_or_none()
    if app is None or app["student_id"] != student_id:
        raise DomainError(404, "NOT_FOUND", "Application not found.")
    note = (reason or "Cancelled by the student")[:255]

    if app["status"] == "HELD":
        _release_hold(db, application_id, app["inventory_id"], "CANCELLED", note)
        db.commit()
        return CancelResult(application_id, "CANCELLED", False)

    if app["status"] == "ALLOCATED":
        alloc = db.execute(
            text("SELECT allocation_id, status FROM allocations WHERE application_id = :id FOR UPDATE"), {"id": application_id}
        ).mappings().one()
        if alloc["status"] != "ALLOCATED":
            raise DomainError(409, "INVALID_STATE", "The student has already checked in. Ask the warden to check out.")
        db.execute(text("UPDATE allocations SET status = 'CANCELLED', released_at = now() WHERE allocation_id = :id"), {"id": alloc["allocation_id"]})
        db.execute(text("UPDATE hostel_applications SET status = 'CANCELLED', decided_at = now(), status_reason = :r WHERE application_id = :id"), {"r": note, "id": application_id})
        db.execute(
            text(
                """UPDATE bed_inventory
                      SET beds_allocated = beds_allocated - 1, beds_available = beds_available + 1, version = version + 1
                    WHERE inventory_id = :inv AND beds_allocated >= 1"""
            ),
            {"inv": app["inventory_id"]},
        )
        paid = db.execute(
            text("SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE application_id = :id AND fee_type IN ('RENT', 'DEPOSIT') AND status = 'SUCCESS'"),
            {"id": application_id},
        ).scalar_one()
        refund = paid > 0
        if refund:
            db.execute(
                text(
                    """INSERT INTO payment_records (application_id, student_id, fee_type, amount, currency, status)
                       VALUES (:app, :student, 'REFUND', :amount, 'INR', 'PENDING')"""
                ),
                {"app": application_id, "student": student_id, "amount": paid},
            )
        _add_outbox(db, "ALLOCATION", alloc["allocation_id"], "accommodation.allocation.cancelled",
                    {"allocation_id": alloc["allocation_id"], "application_id": application_id, "student_id": student_id})
        db.commit()
        return CancelResult(application_id, "CANCELLED", refund)

    raise DomainError(409, "INVALID_STATE", f"Cannot cancel an application that is {app['status']}.")


# --------------------------------------------------------------------------- expire old holds
def expire_holds(db: Session) -> int:
    """HELD applications past hold_expires_at become EXPIRED and their beds return to the inventory. Returns beds released."""
    released = db.execute(
        text(
            """WITH expired AS (
                   UPDATE hostel_applications
                      SET status = 'EXPIRED', decided_at = now(), status_reason = 'Hold time ran out'
                    WHERE status = 'HELD' AND hold_expires_at < now()
                RETURNING inventory_id
               ), counts AS (
                   SELECT inventory_id, COUNT(*) AS n FROM expired GROUP BY inventory_id
               ), upd AS (
                   UPDATE bed_inventory i
                      SET beds_held = i.beds_held - c.n, beds_available = i.beds_available + c.n, version = i.version + 1
                     FROM counts c
                    WHERE i.inventory_id = c.inventory_id
                RETURNING c.n
               )
               SELECT COALESCE(SUM(n), 0) FROM upd"""
        )
    ).scalar_one()
    db.commit()
    return int(released)


# --------------------------------------------------------------------------- read one application
def get_application(db: Session, student_id: uuid.UUID, application_id: uuid.UUID) -> dict:
    row = db.execute(
        text(
            """SELECT a.application_id, a.status, a.hold_expires_at, a.status_reason, a.applied_at,
                      f.rent_amount, f.deposit_amount, COALESCE(f.currency, 'INR') AS currency
                 FROM hostel_applications a
                 JOIN bed_inventory i ON i.inventory_id = a.inventory_id
                 LEFT JOIN fee_schedules f ON f.term_id = a.term_id AND f.room_type_id = i.room_type_id
                WHERE a.application_id = :id AND a.student_id = :student"""
        ),
        {"id": application_id, "student": student_id},
    ).mappings().one_or_none()
    if row is None:
        raise DomainError(404, "NOT_FOUND", "Application not found.")
    out = dict(row)
    allocation = _existing_allocation(db, application_id)
    out["allocation"] = allocation
    return out
