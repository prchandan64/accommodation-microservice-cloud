"""Demo data: 2 hostels, rooms and beds, one open term, fees, bed inventory and 4 students.

    python -m app.seed

Safe to run twice (it stops if a term already exists). All demo accounts use the password Password123! (development only).
Demo records are labelled SIMULATED in the account names.
"""
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal
from .security import hash_password

DEV_PASSWORD = "Password123!"   # demo accounts only; never use in production


def _one(db: Session, sql: str, **params):
    return db.execute(text(sql), params).scalar_one()


def seed(db: Session) -> dict:
    if settings.environment != "dev":
        raise RuntimeError("Demo seed data with default passwords cannot be loaded outside development")
    if db.execute(text("SELECT 1 FROM academic_terms LIMIT 1")).first():
        print("Database already has a term; nothing to do.")
        return {}

    today = date.today()
    start = today + timedelta(days=30)
    end = start + timedelta(days=150)
    term_id = _one(db, """INSERT INTO academic_terms (name, start_date, end_date, applications_open_at, applications_close_at, status)
                          VALUES (:n, :s, :e, now() - interval '1 day', now() + interval '60 days', 'OPEN') RETURNING term_id""",
                   n=f"{start.year}-{(start.year + 1) % 100:02d} Term (SIMULATED)", s=start, e=end)

    room_types = {}
    for name, beds, bath in (("Single", 1, True), ("Double sharing", 2, False), ("Triple sharing", 3, False)):
        room_types[name] = (_one(db, "INSERT INTO room_types (name, bed_count, has_attached_bathroom) VALUES (:n, :b, :bath) RETURNING room_type_id",
                                 n=name, b=beds, bath=bath), beds)
    for amenity in ("Wi-Fi", "Study desk", "Wardrobe", "Geyser"):
        amenity_id = _one(db, "INSERT INTO amenities (name) VALUES (:n) RETURNING amenity_id", n=amenity)
        if amenity != "Geyser":
            for rt_id, _ in room_types.values():
                db.execute(text("INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES (:r, :a)"), {"r": rt_id, "a": amenity_id})

    fees = {"Single": ("60000.00", "15000.00"), "Double sharing": ("45000.00", "10000.00"), "Triple sharing": ("35000.00", "10000.00")}
    for name, (rent, deposit) in fees.items():
        db.execute(text("INSERT INTO fee_schedules (term_id, room_type_id, rent_amount, deposit_amount) VALUES (:t, :r, :rent, :dep)"),
                   {"t": term_id, "r": room_types[name][0], "rent": rent, "dep": deposit})

    layout = {"BH-1": ("Boys Hostel 1", "MALE", {"Single": 2, "Double sharing": 4, "Triple sharing": 2}),
              "GH-1": ("Girls Hostel 1", "FEMALE", {"Single": 2, "Double sharing": 4})}
    inventories = {}
    hostel_ids = {}
    for code, (hname, policy, rooms) in layout.items():
        hostel_id = _one(db, "INSERT INTO hostels (hostel_code, name, gender_policy) VALUES (:c, :n, :p) RETURNING hostel_id", c=code, n=hname, p=policy)
        hostel_ids[code] = hostel_id
        block_id = _one(db, "INSERT INTO blocks (hostel_id, block_code, name, floors) VALUES (:h, 'A', 'Block A', 3) RETURNING block_id", h=hostel_id)
        number = 100
        for rt_name, count in rooms.items():
            rt_id, bed_count = room_types[rt_name]
            for _ in range(count):
                number += 1
                room_id = _one(db, "INSERT INTO rooms (block_id, room_type_id, room_number, floor) VALUES (:b, :t, :n, :f) RETURNING room_id",
                               b=block_id, t=rt_id, n=str(number), f=number // 100 - 1)
                for label in "ABC"[:bed_count]:
                    db.execute(text("INSERT INTO beds (room_id, bed_label) VALUES (:r, :l)"), {"r": room_id, "l": label})
            total = count * bed_count
            inventories[f"{code} / {rt_name}"] = _one(
                db, """INSERT INTO bed_inventory (hostel_id, room_type_id, term_id, beds_total, beds_available)
                       VALUES (:h, :t, :term, :tot, :tot) RETURNING inventory_id""", h=hostel_id, t=rt_id, term=term_id, tot=total)

    pw = hash_password(DEV_PASSWORD)
    students = {}
    for i, (name, gender) in enumerate((("Asha (SIMULATED)", "FEMALE"), ("Ravi (SIMULATED)", "MALE"), ("Kiran (SIMULATED)", "MALE"), ("Meera (SIMULATED)", "FEMALE")), 1):
        email = f"student{i}@example.test"
        account_id = _one(db, """INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                                 VALUES (:e, :h, 'STUDENT', :n) RETURNING account_id""", e=email, h=pw, n=name)
        _one(db, "INSERT INTO students (account_id, enrollment_no, gender, course, year_of_study) VALUES (:a, :en, :g, 'B.Tech', 2) RETURNING student_id",
             a=account_id, en=f"EN2026{i:03d}", g=gender)
        students[f"{name} - {email}"] = "student"
    staff = {}
    warden_acc = _one(db, """INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                             VALUES ('warden1@example.test', :h, 'WARDEN', 'Warden BH-1 (SIMULATED)') RETURNING account_id""", h=pw)
    db.execute(text("INSERT INTO wardens (account_id, hostel_id, employee_code) VALUES (:a, :h, 'W-001')"), {"a": warden_acc, "h": hostel_ids["BH-1"]})
    staff["Warden (Boys Hostel 1) - warden1@example.test"] = "warden"
    _one(db, """INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                VALUES ('admin@example.test', :h, 'HOUSING_ADMIN', 'Housing Admin (SIMULATED)') RETURNING account_id""", h=pw)
    staff["Housing admin - admin@example.test"] = "admin"
    db.commit()
    return {"logins (password Password123!)": {**students, **staff}, "inventories": inventories}


if __name__ == "__main__":
    with SessionLocal() as session:
        ids = seed(session)
    for section, items in ids.items():
        print(f"\n{section}:")
        for name, value in items.items():
            print(f"  {name:32s} {value}")
