"""Tests run against a REAL PostgreSQL (the engine depends on row locks and the no-overlap rule).

    docker compose up -d
    pytest

TEST_DATABASE_URL defaults to the campus_mobility_accommodation_test database created by docker-compose.
The schema is rebuilt from sql/schema.sql at the start of the test run.
"""
import os
import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import create_engine, text
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_email_sender
from app.config import settings
from app.db import get_db

# Ensure test JWT secret meets >= 32-byte HMAC-SHA256 recommendation
if len(settings.jwt_secret) < 32:
    settings.jwt_secret = "test-only-jwt-secret-key-at-least-32-bytes-long"
from app.main import app
from app.security import create_access_token, hash_password
from app.sqlutil import SCHEMA_FILE, run_script

TEST_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://accommodation:accommodation@localhost:5432/campus_mobility_accommodation_test")


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_URL, pool_size=30, max_overflow=10)
    with eng.begin() as conn:
        conn.exec_driver_sql("DROP SCHEMA public CASCADE")
        conn.exec_driver_sql("CREATE SCHEMA public")
        run_script(conn, SCHEMA_FILE.read_text())
    yield eng
    eng.dispose()


@pytest.fixture()
def Session(engine):
    """A session factory on an empty database (all tables truncated before each test)."""
    with engine.begin() as conn:
        tables = [r[0] for r in conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))]
        conn.exec_driver_sql("TRUNCATE " + ", ".join(tables) + " RESTART IDENTITY CASCADE")
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _id(db, sql, **p):
    return db.execute(text(sql), p).scalar_one()


def make_student(db, gender="MALE"):
    n = uuid.uuid4().hex[:10]
    account = _id(db, "INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name) VALUES (:e, 'x', 'STUDENT', 'Test') RETURNING account_id", e=f"{n}@test.example")
    return _id(db, "INSERT INTO students (account_id, enrollment_no, gender) VALUES (:a, :en, :g) RETURNING student_id", a=account, en=n, g=gender)


@pytest.fixture()
def world(Session):
    """Factory: world(beds=1, policy='MIXED') -> dict with ids. One hostel, single-bed rooms, an open term, fees, inventory."""
    def build(beds=1, policy="MIXED", rent="45000.00", deposit="10000.00", window_open=True):
        with Session() as db:
            start = date.today() + timedelta(days=30)
            close_sql = "now() + interval '30 days'" if window_open else "now() - interval '1 hour'"
            term = _id(db, f"""INSERT INTO academic_terms (name, start_date, end_date, applications_open_at, applications_close_at, status)
                               VALUES ('T', :s, :e, now() - interval '2 days', {close_sql}, 'OPEN') RETURNING term_id""", s=start, e=start + timedelta(days=150))
            hostel = _id(db, "INSERT INTO hostels (hostel_code, name, gender_policy) VALUES ('H1', 'Hostel 1', :p) RETURNING hostel_id", p=policy)
            block = _id(db, "INSERT INTO blocks (hostel_id, block_code, name) VALUES (:h, 'A', 'Block A') RETURNING block_id", h=hostel)
            rtype = _id(db, "INSERT INTO room_types (name, bed_count) VALUES ('Single', 1) RETURNING room_type_id")
            bed_ids = []
            for i in range(beds):
                room = _id(db, "INSERT INTO rooms (block_id, room_type_id, room_number, floor) VALUES (:b, :t, :n, 1) RETURNING room_id", b=block, t=rtype, n=str(100 + i))
                bed_ids.append(_id(db, "INSERT INTO beds (room_id, bed_label) VALUES (:r, 'A') RETURNING bed_id", r=room))
            db.execute(text("INSERT INTO fee_schedules (term_id, room_type_id, rent_amount, deposit_amount) VALUES (:t, :r, :rent, :dep)"), {"t": term, "r": rtype, "rent": rent, "dep": deposit})
            inventory = _id(db, """INSERT INTO bed_inventory (hostel_id, room_type_id, term_id, beds_total, beds_available)
                                   VALUES (:h, :r, :t, :n, :n) RETURNING inventory_id""", h=hostel, r=rtype, t=term, n=beds)
            db.commit()
        return {"term": term, "hostel": hostel, "inventory": inventory, "beds": bed_ids, "room_type": rtype}
    return build


def counters(Session, inventory_id):
    with Session() as db:
        r = db.execute(text("SELECT beds_total, beds_available, beds_held, beds_allocated FROM bed_inventory WHERE inventory_id = :i"), {"i": inventory_id}).one()
    return {"total": r[0], "available": r[1], "held": r[2], "allocated": r[3]}


# ----------------------------------------------------------------------------- login helpers
API = "/api/v1/accommodation"
PASSWORD = "Password123!"


class CapturingSender:
    """Stands in for the email sender and remembers the codes it was asked to send."""

    def __init__(self):
        self.sent = []

    def send_otp(self, to_email, code, ttl_minutes):
        self.sent.append((to_email, code))

    @property
    def last_code(self):
        return self.sent[-1][1]


@pytest.fixture()
def emails():
    return CapturingSender()


@pytest.fixture()
def client(Session, emails):
    """An API client wired to the test database and the capturing email sender."""
    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_email_sender] = lambda: emails
    yield TestClient(app)          # no "with": the background expiry timer is not started in tests
    app.dependency_overrides.clear()


def make_account(db, role="STUDENT", email=None, password=PASSWORD, status="ACTIVE"):
    email = email or f"{uuid.uuid4().hex[:10]}@test.example"
    account_id = _id(db, """INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name, account_status)
                            VALUES (:e, :h, :r, 'Test User', :s) RETURNING account_id""", e=email, h=hash_password(password), r=role, s=status)
    return account_id, email


def student_with_login(Session, gender="MALE"):
    """Creates a student account and returns (student_id, auth headers) without going through the login screens."""
    with Session() as db:
        account_id, _ = make_account(db, "STUDENT")
        student_id = _id(db, "INSERT INTO students (account_id, enrollment_no, gender) VALUES (:a, :en, :g) RETURNING student_id",
                         a=account_id, en=uuid.uuid4().hex[:10], g=gender)
        db.commit()
    token, _ = create_access_token(account_id=account_id, role="STUDENT", student_id=student_id)
    return student_id, {"Authorization": f"Bearer {token}"}


def admin_with_login(Session):
    with Session() as db:
        account_id, email = make_account(db, "HOUSING_ADMIN")
        db.commit()
    token, _ = create_access_token(account_id=account_id, role="HOUSING_ADMIN")
    return account_id, {"Authorization": f"Bearer {token}"}
