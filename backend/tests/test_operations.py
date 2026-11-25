"""Regression tests for operations edge cases (check-ins and maintenance tickets)."""
import uuid

from sqlalchemy import text

from app.security import create_access_token

from .conftest import API, make_student


def token_for(account_id, role: str, **kwargs):
    token, _ = create_access_token(account_id=account_id, role=role, **kwargs)
    return {"Authorization": f"Bearer {token}"}


def _make_staff(Session, role: str, hostel_id=None):
    with Session() as db:
        n = uuid.uuid4().hex[:8]
        acc_id = db.execute(
            text(
                """INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                   VALUES (:e, 'x', :r, :name) RETURNING account_id"""
            ),
            {"e": f"{role.lower()}-{n}@test.example", "r": role, "name": f"Test {role}"},
        ).scalar_one()
        warden_id = None
        if role == "WARDEN":
            warden_id = db.execute(
                text(
                    """INSERT INTO wardens (account_id, hostel_id, employee_code)
                       VALUES (:a, :h, :c) RETURNING warden_id"""
                ),
                {"a": acc_id, "h": hostel_id, "c": f"EMP-{n}"},
            ).scalar_one()
        db.commit()
        return acc_id, warden_id


def _create_allocated_student(client, Session, world):
    w = world(beds=1)
    with Session() as db:
        sid = make_student(db)
        acc_id = db.execute(text("SELECT account_id FROM students WHERE student_id = :s"), {"s": sid}).scalar_one()
        db.commit()
    student_headers = token_for(acc_id, "STUDENT", student_id=sid)
    r = client.post(f"{API}/applications", json={"inventory_id": str(w["inventory"])}, headers=student_headers)
    assert r.status_code == 201
    app_id = r.json()["application_id"]
    p = client.post(f"{API}/applications/{app_id}/pay", json={"payment_token": "tok_ok"}, headers=student_headers)
    assert p.status_code == 200
    alloc_id = p.json()["allocation"]["allocation_id"]
    return w, sid, student_headers, alloc_id


def test_housing_admin_cannot_perform_warden_checkin(client, Session, world):
    w, _, _, alloc_id = _create_allocated_student(client, Session, world)
    admin_acc, _ = _make_staff(Session, "HOUSING_ADMIN")
    admin_headers = token_for(admin_acc, "HOUSING_ADMIN")

    r = client.post(
        f"{API}/warden/check-ins",
        json={"allocation_id": alloc_id, "room_condition": "GOOD", "condition_notes": "Clean"},
        headers=admin_headers,
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN_ROLE"


def test_warden_checkin_succeeds_and_rejects_duplicate(client, Session, world):
    w, _, _, alloc_id = _create_allocated_student(client, Session, world)
    warden_acc, warden_id = _make_staff(Session, "WARDEN", hostel_id=w["hostel"])
    warden_headers = token_for(warden_acc, "WARDEN", warden_id=warden_id, hostel_id=w["hostel"])

    r1 = client.post(
        f"{API}/warden/check-ins",
        json={"allocation_id": alloc_id, "room_condition": "GOOD", "condition_notes": "All good"},
        headers=warden_headers,
    )
    assert r1.status_code == 201
    assert r1.json()["status"] == "CHECKED_IN"

    r2 = client.post(
        f"{API}/warden/check-ins",
        json={"allocation_id": alloc_id, "room_condition": "GOOD"},
        headers=warden_headers,
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "INVALID_STATE"


def test_ticket_creation_requires_valid_room(client, Session, world):
    world(beds=1)
    with Session() as db:
        sid = make_student(db)
        acc_id = db.execute(text("SELECT account_id FROM students WHERE student_id = :s"), {"s": sid}).scalar_one()
        db.commit()
    student_headers = token_for(acc_id, "STUDENT", student_id=sid)

    r_missing = client.post(
        f"{API}/tickets",
        json={"category": "ELECTRICAL", "priority": "HIGH", "title": "Light out"},
        headers=student_headers,
    )
    assert r_missing.status_code == 400
    assert r_missing.json()["error"]["code"] == "ROOM_REQUIRED"

    r_invalid = client.post(
        f"{API}/tickets",
        json={"category": "ELECTRICAL", "priority": "HIGH", "title": "Light out", "room_id": str(uuid.uuid4())},
        headers=student_headers,
    )
    assert r_invalid.status_code == 404
    assert r_invalid.json()["error"]["code"] == "ROOM_NOT_FOUND"


def test_tickets_me_isolates_student_and_warden_roles(client, Session, world):
    w, _, student_headers, _ = _create_allocated_student(client, Session, world)
    warden_acc, warden_id = _make_staff(Session, "WARDEN", hostel_id=w["hostel"])
    warden_headers = token_for(warden_acc, "WARDEN", warden_id=warden_id, hostel_id=w["hostel"])

    with Session() as db:
        room_id = db.execute(text("SELECT room_id FROM rooms LIMIT 1")).scalar_one()

    rs = client.post(
        f"{API}/tickets",
        json={"category": "PLUMBING", "priority": "MEDIUM", "title": "Tap leak"},
        headers=student_headers,
    )
    assert rs.status_code == 201

    rw = client.post(
        f"{API}/tickets",
        json={"category": "NETWORK", "priority": "LOW", "title": "AP reset", "room_id": str(room_id)},
        headers=warden_headers,
    )
    assert rw.status_code == 201

    student_list = client.get(f"{API}/tickets/me", headers=student_headers).json()
    warden_list = client.get(f"{API}/tickets/me", headers=warden_headers).json()
    assert [t["title"] for t in student_list] == ["Tap leak"]
    assert [t["title"] for t in warden_list] == ["AP reset"]
