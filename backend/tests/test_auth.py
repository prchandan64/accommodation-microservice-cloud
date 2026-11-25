from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import text

from app.config import settings

from .conftest import API, PASSWORD, admin_with_login, make_account, student_with_login


def register(client, email="new@test.example", enrollment="EN100", password=PASSWORD, gender="MALE"):
    return client.post(f"{API}/auth/register", json={"email": email, "password": password, "full_name": "New Student",
                                                     "enrollment_no": enrollment, "gender": gender})


def start_login(client, email, password=PASSWORD):
    return client.post(f"{API}/auth/login", json={"email": email, "password": password})


def full_login(client, emails, email, password=PASSWORD):
    r = start_login(client, email, password)
    assert r.status_code == 200, r.text
    return client.post(f"{API}/auth/verify-otp", json={"challenge_id": r.json()["challenge_id"], "otp_code": emails.last_code})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def wrong_code(real):
    return "000000" if real != "000000" else "111111"


# ----------------------------------------------------------------------------- the normal path
def test_register_login_verify_and_use_the_token(client, emails, world):
    w = world(beds=1)
    assert register(client).status_code == 201
    r = full_login(client, emails, "new@test.example")
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "STUDENT" and body["token_type"] == "bearer" and body["expires_in"] == settings.jwt_expire_minutes * 60

    me = client.get(f"{API}/auth/me", headers=bearer(body["access_token"])).json()
    assert me["email"] == "new@test.example" and me["role"] == "STUDENT" and me["student_id"] is not None
    assert client.get(f"{API}/availability", headers=bearer(body["access_token"])).status_code == 200


def test_duplicate_email_or_enrollment_is_refused(client):
    assert register(client).status_code == 201
    r = register(client, email="NEW@test.example", enrollment="EN200")          # same email in capitals
    assert (r.status_code, r.json()["error"]["code"]) == (409, "EMAIL_ALREADY_REGISTERED")
    r = register(client, email="other@test.example", enrollment="EN100")
    assert (r.status_code, r.json()["error"]["code"]) == (409, "ENROLLMENT_ALREADY_REGISTERED")


def test_password_is_stored_as_a_hash(client, Session):
    register(client)
    with Session() as db:
        stored = db.execute(text("SELECT hashed_password FROM accommodation_auth_accounts")).scalar_one()
    assert stored != PASSWORD and stored.startswith("$argon2")


def test_short_password_is_a_validation_error(client):
    r = register(client, password="short")
    assert (r.status_code, r.json()["error"]["code"]) == (422, "VALIDATION_ERROR")


# ----------------------------------------------------------------------------- step 1: email and password
def test_wrong_password_and_unknown_email_look_the_same(client, emails):
    register(client)
    a = start_login(client, "new@test.example", "WrongPassword1")
    b = start_login(client, "nobody@test.example", "WrongPassword1")
    assert a.status_code == b.status_code == 401
    assert a.json()["error"] == b.json()["error"] and a.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert emails.sent == []                                                    # no code is sent


def test_suspended_account_cannot_log_in(client, Session, emails):
    with Session() as db:
        _, email = make_account(db, "STUDENT", status="SUSPENDED")
        db.commit()
    r = start_login(client, email)
    assert (r.status_code, r.json()["error"]["code"]) == (403, "ACCOUNT_SUSPENDED")
    assert emails.sent == []
    assert start_login(client, email, "WrongPassword1").json()["error"]["code"] == "INVALID_CREDENTIALS"


# ----------------------------------------------------------------------------- step 2: the 6-digit code
def test_wrong_codes_are_counted_and_lock_the_challenge(client, emails):
    register(client)
    cid = start_login(client, "new@test.example").json()["challenge_id"]
    bad = wrong_code(emails.last_code)
    for left in (4, 3, 2, 1):
        r = client.post(f"{API}/auth/verify-otp", json={"challenge_id": cid, "otp_code": bad})
        assert (r.status_code, r.json()["error"]["code"]) == (401, "OTP_INVALID")
        assert r.json()["error"]["details"]["attempts_left"] == left
    r = client.post(f"{API}/auth/verify-otp", json={"challenge_id": cid, "otp_code": bad})
    assert (r.status_code, r.json()["error"]["code"]) == (429, "OTP_ATTEMPTS_EXCEEDED")
    r = client.post(f"{API}/auth/verify-otp", json={"challenge_id": cid, "otp_code": emails.last_code})   # even the right code is refused now
    assert (r.status_code, r.json()["error"]["code"]) == (429, "OTP_ATTEMPTS_EXCEEDED")


def test_expired_code(client, emails, Session):
    register(client)
    cid = start_login(client, "new@test.example").json()["challenge_id"]
    with Session() as db:
        db.execute(text("UPDATE email_otp_challenges SET expires_at = now() - interval '1 second'"))
        db.commit()
    r = client.post(f"{API}/auth/verify-otp", json={"challenge_id": cid, "otp_code": emails.last_code})
    assert (r.status_code, r.json()["error"]["code"]) == (401, "OTP_EXPIRED")


def test_a_code_works_only_once(client, emails):
    register(client)
    cid = start_login(client, "new@test.example").json()["challenge_id"]
    code = emails.last_code
    assert client.post(f"{API}/auth/verify-otp", json={"challenge_id": cid, "otp_code": code}).status_code == 200
    r = client.post(f"{API}/auth/verify-otp", json={"challenge_id": cid, "otp_code": code})
    assert (r.status_code, r.json()["error"]["code"]) == (401, "OTP_INVALID")


def test_resend_is_rate_limited_and_replaces_the_old_code(client, emails, Session):
    register(client)
    first = start_login(client, "new@test.example").json()["challenge_id"]
    old_code = emails.last_code
    r = client.post(f"{API}/auth/resend-otp", json={"challenge_id": first})
    assert (r.status_code, r.json()["error"]["code"]) == (429, "RATE_LIMITED")

    with Session() as db:
        db.execute(text("UPDATE email_otp_challenges SET created_at = now() - interval '2 minutes'"))
        db.commit()
    r = client.post(f"{API}/auth/resend-otp", json={"challenge_id": first})
    assert r.status_code == 200
    second = r.json()["challenge_id"]
    assert second != first and len(emails.sent) == 2

    r = client.post(f"{API}/auth/verify-otp", json={"challenge_id": first, "otp_code": old_code})
    assert (r.status_code, r.json()["error"]["code"]) == (401, "OTP_INVALID")             # the old code is dead
    assert client.post(f"{API}/auth/verify-otp", json={"challenge_id": second, "otp_code": emails.last_code}).status_code == 200


# ----------------------------------------------------------------------------- tokens
def test_bad_tokens_are_refused(client, emails):
    register(client)
    token = full_login(client, emails, "new@test.example").json()["access_token"]
    me_url = f"{API}/auth/me"
    assert client.get(me_url, headers=bearer(token)).status_code == 200
    assert client.get(me_url, headers=bearer(token + "x")).status_code == 401                         # tampered
    other = jwt.encode({"sub": "00000000-0000-0000-0000-000000000000", "role": "STUDENT",
                        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())}, "another-secret", algorithm="HS256")
    assert client.get(me_url, headers=bearer(other)).status_code == 401                              # signed with another key
    old = jwt.encode({"sub": "00000000-0000-0000-0000-000000000000", "role": "STUDENT",
                      "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp())}, settings.jwt_secret, algorithm="HS256")
    r = client.get(me_url, headers=bearer(old))
    assert r.status_code == 401 and "expired" in r.json()["error"]["message"]
    assert client.get(me_url).status_code == 401                                                     # no token


def test_suspension_locks_out_an_existing_token(client, Session):
    _, student_headers = student_with_login(Session)
    me = client.get(f"{API}/auth/me", headers=student_headers).json()
    _, admin_headers = admin_with_login(Session)
    r = client.patch(f"{API}/admin/accounts/{me['account_id']}/status", json={"account_status": "SUSPENDED"}, headers=admin_headers)
    assert r.status_code == 200
    r = client.get(f"{API}/auth/me", headers=student_headers)
    assert (r.status_code, r.json()["error"]["code"]) == (403, "ACCOUNT_SUSPENDED")
    client.patch(f"{API}/admin/accounts/{me['account_id']}/status", json={"account_status": "ACTIVE"}, headers=admin_headers)
    assert client.get(f"{API}/auth/me", headers=student_headers).status_code == 200


# ----------------------------------------------------------------------------- roles
def test_roles_are_enforced_and_staff_can_be_created(client, emails, Session, world):
    w = world(beds=1)
    _, student_headers = student_with_login(Session)
    _, admin_headers = admin_with_login(Session)
    body = {"email": "warden@test.example", "full_name": "A Warden", "role": "WARDEN", "password": PASSWORD,
            "hostel_id": str(w["hostel"]), "employee_code": "W1"}

    r = client.post(f"{API}/admin/accounts", json=body)
    assert (r.status_code, r.json()["error"]["code"]) == (401, "UNAUTHENTICATED")
    r = client.post(f"{API}/admin/accounts", json=body, headers=student_headers)
    assert (r.status_code, r.json()["error"]["code"]) == (403, "FORBIDDEN_ROLE")

    r = client.post(f"{API}/admin/accounts", json=body, headers=admin_headers)
    assert r.status_code == 201 and r.json()["warden_id"] is not None
    assert client.post(f"{API}/admin/accounts", json=body, headers=admin_headers).json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"

    token = full_login(client, emails, "warden@test.example").json()["access_token"]
    me = client.get(f"{API}/auth/me", headers=bearer(token)).json()
    assert me["role"] == "WARDEN" and me["hostel_id"] == str(w["hostel"])
    r = client.get(f"{API}/availability", headers=bearer(token))                          # student-only endpoint
    assert (r.status_code, r.json()["error"]["code"]) == (403, "FORBIDDEN_ROLE")
    with Session() as db:
        assert db.execute(text("SELECT COUNT(*) FROM audit_logs WHERE action = 'ACCOUNT_CREATED'")).scalar_one() == 1


def test_a_warden_needs_a_hostel_and_an_admin_cannot_suspend_themselves(client, Session):
    admin_id, admin_headers = admin_with_login(Session)
    r = client.post(f"{API}/admin/accounts", json={"email": "w2@test.example", "full_name": "W", "role": "WARDEN", "password": PASSWORD}, headers=admin_headers)
    assert (r.status_code, r.json()["error"]["code"]) == (422, "VALIDATION_ERROR")
    r = client.patch(f"{API}/admin/accounts/{admin_id}/status", json={"account_status": "SUSPENDED"}, headers=admin_headers)
    assert (r.status_code, r.json()["error"]["code"]) == (409, "INVALID_STATE")


# ----------------------------------------------------------------------------- password change
def test_change_password(client, emails):
    register(client)
    token = full_login(client, emails, "new@test.example").json()["access_token"]
    new = "AnotherPass456!"
    r = client.patch(f"{API}/auth/password", json={"current_password": "wrong-password", "new_password": new}, headers=bearer(token))
    assert (r.status_code, r.json()["error"]["code"]) == (401, "INVALID_CREDENTIALS")
    assert client.patch(f"{API}/auth/password", json={"current_password": PASSWORD, "new_password": new}, headers=bearer(token)).status_code == 200
    assert start_login(client, "new@test.example", PASSWORD).status_code == 401
    assert start_login(client, "new@test.example", new).status_code == 200
