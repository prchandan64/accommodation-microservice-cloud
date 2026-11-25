"""The important tests: many students at the same moment."""
import threading
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import text

from app.errors import DomainError
from app.services import booking
from app.services.payments import MockPaymentGateway

from .conftest import counters, make_student


def run_parallel(n, fn):
    """Run fn(i) in n threads that all start together. Returns [("ok", value) | ("err", code)]."""
    barrier = threading.Barrier(n)

    def task(i):
        barrier.wait()
        try:
            return ("ok", fn(i))
        except DomainError as exc:
            return ("err", exc.code)

    with ThreadPoolExecutor(max_workers=n) as pool:
        return list(pool.map(task, range(n)))


def students(Session, n):
    with Session() as db:
        ids = [make_student(db) for _ in range(n)]
        db.commit()
    return ids


def test_last_bed_goes_to_exactly_one_student(Session, world):
    w = world(beds=1)
    people = students(Session, 10)

    def apply(i):
        with Session() as db:
            return booking.hold_bed(db, people[i], w["inventory"])

    results = run_parallel(10, apply)
    assert [r[0] for r in results].count("ok") == 1
    assert [r[1] for r in results if r[0] == "err"] == ["NO_BEDS_AVAILABLE"] * 9
    assert counters(Session, w["inventory"]) == {"total": 1, "available": 0, "held": 1, "allocated": 0}
    with Session() as db:
        statuses = [r[0] for r in db.execute(text("SELECT status FROM hostel_applications"))]
    assert sorted(statuses) == ["HELD"] + ["REJECTED"] * 9


def test_never_sells_more_beds_than_exist(Session, world):
    w = world(beds=5)
    people = students(Session, 25)

    def apply(i):
        with Session() as db:
            return booking.hold_bed(db, people[i], w["inventory"])

    results = run_parallel(25, apply)
    assert [r[0] for r in results].count("ok") == 5
    assert counters(Session, w["inventory"]) == {"total": 5, "available": 0, "held": 5, "allocated": 0}


def test_one_student_double_clicking_gets_one_hold(Session, world):
    w = world(beds=5)
    (student,) = students(Session, 1)

    def apply(i):
        with Session() as db:
            return booking.hold_bed(db, student, w["inventory"])

    results = run_parallel(6, apply)
    assert [r[0] for r in results].count("ok") == 1
    assert [r[1] for r in results if r[0] == "err"] == ["ALREADY_APPLIED"] * 5
    assert counters(Session, w["inventory"])["held"] == 1


def test_parallel_payments_get_different_beds(Session, world):
    w = world(beds=5)
    people = students(Session, 5)
    holds = []
    for s in people:
        with Session() as db:
            holds.append(booking.hold_bed(db, s, w["inventory"]))
    gateway = MockPaymentGateway()

    def pay(i):
        with Session() as db:
            return booking.pay_application(db, people[i], holds[i].application_id, "tok_ok", gateway)

    results = run_parallel(5, pay)
    assert [r[0] for r in results] == ["ok"] * 5, results
    with Session() as db:
        distinct_beds = db.execute(text("SELECT COUNT(DISTINCT bed_id) FROM allocations")).scalar_one()
        total = db.execute(text("SELECT COUNT(*) FROM allocations")).scalar_one()
    assert (distinct_beds, total) == (5, 5)
    assert counters(Session, w["inventory"]) == {"total": 5, "available": 0, "held": 0, "allocated": 5}


def test_same_payment_sent_twice_at_once_charges_once(Session, world):
    w = world(beds=2)
    (student,) = students(Session, 1)
    with Session() as db:
        h = booking.hold_bed(db, student, w["inventory"])
    gateway = MockPaymentGateway()

    def pay(i):
        with Session() as db:
            return booking.pay_application(db, student, h.application_id, "tok_ok", gateway)

    results = run_parallel(4, pay)
    assert [r[0] for r in results].count("ok") >= 1
    assert all(r[0] == "ok" or r[1] == "INVALID_STATE" for r in results), results
    with Session() as db:
        assert db.execute(text("SELECT COUNT(*) FROM allocations")).scalar_one() == 1
        assert db.execute(text("SELECT COUNT(*) FROM payment_records WHERE status = 'SUCCESS'")).scalar_one() == 2
    assert counters(Session, w["inventory"]) == {"total": 2, "available": 1, "held": 0, "allocated": 1}
