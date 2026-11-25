from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.errors import DomainError
from app.services import booking
from app.services.payments import MockPaymentGateway

from .conftest import counters, make_student

GW = MockPaymentGateway()


def new_student(Session, gender="MALE"):
    with Session() as db:
        sid = make_student(db, gender)
        db.commit()
    return sid


def hold(Session, student, inventory):
    with Session() as db:
        return booking.hold_bed(db, student, inventory)


def pay(Session, student, application_id, token="tok_ok"):
    with Session() as db:
        return booking.pay_application(db, student, application_id, token, GW)


def cancel(Session, student, application_id):
    with Session() as db:
        return booking.cancel_application(db, student, application_id, "test")


def scalar(Session, sql, **p):
    with Session() as db:
        return db.execute(text(sql), p).scalar_one()


# ----------------------------------------------------------------------------- hold
def test_hold_moves_one_bed_from_available_to_held(Session, world):
    w = world(beds=3)
    r = hold(Session, new_student(Session), w["inventory"])
    assert r.status == "HELD"
    assert r.rent == Decimal("45000.00") and r.total == Decimal("55000.00") and r.currency == "INR"
    assert r.hold_expires_at > datetime.now(timezone.utc)
    assert counters(Session, w["inventory"]) == {"total": 3, "available": 2, "held": 1, "allocated": 0}


def test_no_beds_rejects_and_keeps_the_record(Session, world):
    w = world(beds=1)
    first, second = new_student(Session), new_student(Session)
    hold(Session, first, w["inventory"])
    with pytest.raises(DomainError) as e:
        hold(Session, second, w["inventory"])
    assert (e.value.status_code, e.value.code) == (409, "NO_BEDS_AVAILABLE")
    assert scalar(Session, "SELECT status FROM hostel_applications WHERE student_id = :s", s=second) == "REJECTED"
    assert counters(Session, w["inventory"]) == {"total": 1, "available": 0, "held": 1, "allocated": 0}


def test_rejected_student_can_apply_again_later(Session, world):
    w = world(beds=1)
    a, b = new_student(Session), new_student(Session)
    held = hold(Session, a, w["inventory"])
    with pytest.raises(DomainError):
        hold(Session, b, w["inventory"])
    cancel(Session, a, held.application_id)               # bed comes back
    assert hold(Session, b, w["inventory"]).status == "HELD"


def test_second_live_application_in_a_term_is_refused(Session, world):
    w = world(beds=2)
    s = new_student(Session)
    hold(Session, s, w["inventory"])
    with pytest.raises(DomainError) as e:
        hold(Session, s, w["inventory"])
    assert e.value.code == "ALREADY_APPLIED"
    assert counters(Session, w["inventory"])["held"] == 1


def test_gender_policy_is_checked(Session, world):
    w = world(beds=1, policy="FEMALE")
    with pytest.raises(DomainError) as e:
        hold(Session, new_student(Session, "MALE"), w["inventory"])
    assert (e.value.status_code, e.value.code) == (403, "GENDER_POLICY_MISMATCH")
    assert counters(Session, w["inventory"])["available"] == 1
    assert hold(Session, new_student(Session, "FEMALE"), w["inventory"]).status == "HELD"


def test_closed_term_is_refused(Session, world):
    w = world(beds=1, window_open=False)
    with pytest.raises(DomainError) as e:
        hold(Session, new_student(Session), w["inventory"])
    assert (e.value.status_code, e.value.code) == (422, "TERM_NOT_OPEN")


# ----------------------------------------------------------------------------- pay and allocate
def test_pay_allocates_a_real_bed(Session, world):
    w = world(beds=2)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    r = pay(Session, s, h.application_id)
    assert r.status == "ALLOCATED"
    assert r.allocation.allotment_pass_code.startswith("ALP-")
    assert r.allocation.bed_id in w["beds"]
    assert {(p["fee_type"], p["status"]) for p in r.payments} == {("RENT", "SUCCESS"), ("DEPOSIT", "SUCCESS")}
    assert counters(Session, w["inventory"]) == {"total": 2, "available": 1, "held": 0, "allocated": 1}
    assert scalar(Session, "SELECT status FROM hostel_applications WHERE application_id = :a", a=h.application_id) == "ALLOCATED"
    assert scalar(Session, "SELECT COUNT(*) FROM outbox_events WHERE event_type = 'accommodation.allocation.confirmed'") == 1


def test_paying_twice_does_not_charge_twice(Session, world):
    w = world(beds=2)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    first = pay(Session, s, h.application_id)
    again = pay(Session, s, h.application_id)
    assert again.allocation.allocation_id == first.allocation.allocation_id
    assert scalar(Session, "SELECT COUNT(*) FROM allocations") == 1
    assert scalar(Session, "SELECT COUNT(*) FROM payment_records WHERE status = 'SUCCESS'") == 2


def test_declined_payment_releases_the_bed(Session, world):
    w = world(beds=1)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    with pytest.raises(DomainError) as e:
        pay(Session, s, h.application_id, token="tok_fail")
    assert (e.value.status_code, e.value.code) == (402, "PAYMENT_FAILED")
    assert scalar(Session, "SELECT status FROM hostel_applications WHERE application_id = :a", a=h.application_id) == "FAILED"
    assert scalar(Session, "SELECT COUNT(*) FROM payment_records WHERE status = 'FAILED'") == 2
    assert counters(Session, w["inventory"]) == {"total": 1, "available": 1, "held": 0, "allocated": 0}
    assert hold(Session, s, w["inventory"]).status == "HELD"          # the student may apply again


def test_only_the_owner_can_pay(Session, world):
    w = world(beds=1)
    owner, other = new_student(Session), new_student(Session)
    h = hold(Session, owner, w["inventory"])
    with pytest.raises(DomainError) as e:
        pay(Session, other, h.application_id)
    assert e.value.code == "NOT_FOUND"


# ----------------------------------------------------------------------------- expire
def _make_hold_old(Session, application_id):
    with Session() as db:
        db.execute(text("UPDATE hostel_applications SET hold_expires_at = now() - interval '1 minute' WHERE application_id = :a"), {"a": application_id})
        db.commit()


def test_expire_holds_returns_beds(Session, world):
    w = world(beds=2)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    _make_hold_old(Session, h.application_id)
    with Session() as db:
        assert booking.expire_holds(db) == 1
    assert scalar(Session, "SELECT status FROM hostel_applications WHERE application_id = :a", a=h.application_id) == "EXPIRED"
    assert counters(Session, w["inventory"]) == {"total": 2, "available": 2, "held": 0, "allocated": 0}
    with Session() as db:
        assert booking.expire_holds(db) == 0                      # nothing left to release


def test_paying_after_the_deadline_is_refused(Session, world):
    w = world(beds=1)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    _make_hold_old(Session, h.application_id)
    with pytest.raises(DomainError) as e:
        pay(Session, s, h.application_id)
    assert (e.value.status_code, e.value.code) == (409, "HOLD_EXPIRED")
    assert counters(Session, w["inventory"]) == {"total": 1, "available": 1, "held": 0, "allocated": 0}
    assert scalar(Session, "SELECT COUNT(*) FROM payment_records") == 0          # nobody was charged


# ----------------------------------------------------------------------------- cancel
def test_cancel_while_held_returns_the_bed(Session, world):
    w = world(beds=1)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    r = cancel(Session, s, h.application_id)
    assert (r.status, r.refund_initiated) == ("CANCELLED", False)
    assert counters(Session, w["inventory"]) == {"total": 1, "available": 1, "held": 0, "allocated": 0}


def test_cancel_after_allocation_returns_the_bed_and_asks_for_a_refund(Session, world):
    w = world(beds=2)
    s = new_student(Session)
    h = hold(Session, s, w["inventory"])
    pay(Session, s, h.application_id)
    r = cancel(Session, s, h.application_id)
    assert (r.status, r.refund_initiated) == ("CANCELLED", True)
    assert counters(Session, w["inventory"]) == {"total": 2, "available": 2, "held": 0, "allocated": 0}
    assert scalar(Session, "SELECT status FROM allocations") == "CANCELLED"
    assert scalar(Session, "SELECT amount FROM payment_records WHERE fee_type = 'REFUND'") == Decimal("55000.00")
    assert scalar(Session, "SELECT COUNT(*) FROM outbox_events WHERE event_type = 'accommodation.allocation.cancelled'") == 1


def test_cannot_cancel_someone_elses_application(Session, world):
    w = world(beds=1)
    owner, other = new_student(Session), new_student(Session)
    h = hold(Session, owner, w["inventory"])
    with pytest.raises(DomainError) as e:
        cancel(Session, other, h.application_id)
    assert e.value.code == "NOT_FOUND"


# ----------------------------------------------------------------------------- the database's own safety nets
def test_database_refuses_two_students_in_one_bed(Session, world):
    w = world(beds=2)
    a, c = new_student(Session), new_student(Session)
    h = hold(Session, a, w["inventory"])
    pay(Session, a, h.application_id)
    with Session() as db:
        taken = db.execute(text("SELECT bed_id, start_date, end_date FROM allocations")).one()
        app_c = db.execute(text("""INSERT INTO hostel_applications (student_id, term_id, inventory_id, status)
                                   VALUES (:s, :t, :i, 'APPLIED') RETURNING application_id"""), {"s": c, "t": w["term"], "i": w["inventory"]}).scalar_one()
        with pytest.raises(IntegrityError) as e:
            db.execute(text("""INSERT INTO allocations (application_id, student_id, bed_id, start_date, end_date, allotment_pass_code)
                               VALUES (:a, :s, :b, :sd, :ed, 'ALP-TEST')"""), {"a": app_c, "s": c, "b": taken[0], "sd": taken[1], "ed": taken[2]})
        assert "alloc_no_bed_overlap" in str(e.value)


def test_database_refuses_counters_that_do_not_add_up(Session, world):
    w = world(beds=3)
    with Session() as db:
        with pytest.raises(IntegrityError):
            db.execute(text("UPDATE bed_inventory SET beds_available = beds_available - 1 WHERE inventory_id = :i"), {"i": w["inventory"]})


def test_seed_physical_beds_match_advertised_inventory(Session):
    from app.seed import seed
    with Session() as db:
        seed(db)
        mismatches = db.execute(
            text(
                """SELECT i.inventory_id, i.beds_total, COUNT(b.bed_id) AS physical_beds
                     FROM bed_inventory i
                     LEFT JOIN blocks bl ON bl.hostel_id = i.hostel_id
                     LEFT JOIN rooms r ON r.block_id = bl.block_id AND r.room_type_id = i.room_type_id
                     LEFT JOIN beds b ON b.room_id = r.room_id AND b.status = 'ACTIVE'
                    GROUP BY i.inventory_id, i.beds_total
                   HAVING i.beds_total <> COUNT(b.bed_id)"""
            )
        ).all()
        assert mismatches == []
