"""Security regression tests: IDOR, cross-hostel isolation, CORS, rate limiting, WebSocket origin, and prod guards."""
import asyncio
import uuid

import pytest
from sqlalchemy import text
from starlette.websockets import WebSocketDisconnect

from app.config import settings
from app.main import app, lifespan
from app.security import create_access_token
from app.seed import seed

from .conftest import API, PASSWORD, admin_with_login, make_student


def _token_headers(account_id, role: str, **kwargs):
    token, _ = create_access_token(account_id=account_id, role=role, **kwargs)
    return {"Authorization": f"Bearer {token}"}


def _make_warden(Session, hostel_id):
    with Session() as db:
        n = uuid.uuid4().hex[:8]
        acc_id = db.execute(
            text(
                """INSERT INTO accommodation_auth_accounts (email, hashed_password, role, full_name)
                   VALUES (:e, 'x', 'WARDEN', 'Warden') RETURNING account_id"""
            ),
            {"e": f"warden-{n}@test.example"},
        ).scalar_one()
        wid = db.execute(
            text("INSERT INTO wardens (account_id, hostel_id, employee_code) VALUES (:a, :h, :c) RETURNING warden_id"),
            {"a": acc_id, "h": hostel_id, "c": f"W-{n}"},
        ).scalar_one()
        db.commit()
    return _token_headers(acc_id, "WARDEN", warden_id=wid, hostel_id=hostel_id)


def _allocate_student(client, Session, world):
    w = world(beds=1)
    with Session() as db:
        sid = make_student(db)
        acc_id = db.execute(text("SELECT account_id FROM students WHERE student_id = :s"), {"s": sid}).scalar_one()
        db.commit()
    headers = _token_headers(acc_id, "STUDENT", student_id=sid)
    app_r = client.post(f"{API}/applications", json={"inventory_id": str(w["inventory"])}, headers=headers)
    assert app_r.status_code == 201
    pay_r = client.post(
        f"{API}/applications/{app_r.json()['application_id']}/pay",
        json={"payment_token": "tok_ok"},
        headers=headers,
    )
    assert pay_r.status_code == 200
    return w, headers, pay_r.json()["allocation"]["allocation_id"]


def _second_hostel_with_room(Session):
    with Session() as db:
        hid = db.execute(
            text("INSERT INTO hostels (hostel_code, name, gender_policy) VALUES ('H2', 'Hostel 2', 'MIXED') RETURNING hostel_id")
        ).scalar_one()
        bid = db.execute(
            text("INSERT INTO blocks (hostel_id, block_code, name) VALUES (:h, 'B', 'Block B') RETURNING block_id"),
            {"h": hid},
        ).scalar_one()
        rtid = db.execute(text("SELECT room_type_id FROM room_types LIMIT 1")).scalar_one()
        rid = db.execute(
            text("INSERT INTO rooms (block_id, room_type_id, room_number, floor) VALUES (:b, :rt, '201', 2) RETURNING room_id"),
            {"b": bid, "rt": rtid},
        ).scalar_one()
        db.commit()
        return hid, rid


def test_allotment_pass_idor_and_role_matrix(client, Session, world):
    w, owner_headers, alloc_id = _allocate_student(client, Session, world)

    # Other student
    with Session() as db:
        other_sid = make_student(db)
        other_acc = db.execute(text("SELECT account_id FROM students WHERE student_id = :s"), {"s": other_sid}).scalar_one()
        db.commit()
    other_student_headers = _token_headers(other_acc, "STUDENT", student_id=other_sid)

    # Same-hostel warden, cross-hostel warden, and housing admin
    same_warden_headers = _make_warden(Session, w["hostel"])
    other_hostel_id, _ = _second_hostel_with_room(Session)
    other_warden_headers = _make_warden(Session, other_hostel_id)
    _, admin_headers = admin_with_login(Session)

    assert client.get(f"{API}/allocations/{alloc_id}/pass").status_code == 401
    assert client.get(f"{API}/allocations/{alloc_id}/pass", headers=owner_headers).status_code == 200
    assert client.get(f"{API}/allocations/{alloc_id}/pass", headers=other_student_headers).status_code == 403
    assert client.get(f"{API}/allocations/{alloc_id}/pass", headers=same_warden_headers).status_code == 200
    assert client.get(f"{API}/allocations/{alloc_id}/pass", headers=other_warden_headers).status_code == 403
    assert client.get(f"{API}/allocations/{alloc_id}/pass", headers=admin_headers).status_code == 200


def test_cross_hostel_warden_isolation(client, Session, world):
    w, student_headers, alloc_id = _allocate_student(client, Session, world)
    same_warden = _make_warden(Session, w["hostel"])
    other_hostel_id, other_room_id = _second_hostel_with_room(Session)
    other_warden = _make_warden(Session, other_hostel_id)

    # Student creates swap request and maintenance ticket in Hostel 1
    sr = client.post(f"{API}/swap-requests", json={"reason": "Medical"}, headers=student_headers)
    assert sr.status_code == 201
    swap_id = sr.json()["swap_id"]

    tkt = client.post(f"{API}/tickets", json={"category": "PLUMBING", "priority": "HIGH", "title": "Leak"}, headers=student_headers)
    assert tkt.status_code == 201
    ticket_id = tkt.json()["ticket_id"]

    # Cross-hostel warden cannot see or mutate Hostel 1 records
    assert client.get(f"{API}/warden/allocations", headers=other_warden).json() == []
    assert len(client.get(f"{API}/warden/allocations", headers=same_warden).json()) == 1

    assert client.post(
        f"{API}/warden/check-ins",
        json={"allocation_id": alloc_id, "room_condition": "GOOD"},
        headers=other_warden,
    ).status_code == 403

    assert client.get(f"{API}/warden/swap-requests", headers=other_warden).json() == []
    assert client.post(f"{API}/warden/swap-requests/{swap_id}/approve", headers=other_warden).status_code == 403
    assert client.post(f"{API}/warden/swap-requests/{swap_id}/reject", headers=other_warden).status_code == 403

    assert client.get(f"{API}/warden/tickets", headers=other_warden).json() == []
    assert client.patch(f"{API}/warden/tickets/{ticket_id}", json={"status": "RESOLVED"}, headers=other_warden).status_code == 403

    # Same-hostel warden cannot raise ticket for another hostel's room
    assert client.post(
        f"{API}/tickets",
        json={"category": "ELECTRICAL", "priority": "LOW", "title": "Cross hostel", "room_id": str(other_room_id)},
        headers=same_warden,
    ).status_code == 403


def test_cors_allows_trusted_and_blocks_untrusted_origins(client):
    ok = client.options(
        f"{API}/health",
        headers={"Origin": "http://localhost:3001", "Access-Control-Request-Method": "GET"},
    )
    assert ok.status_code == 200
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3001"
    assert ok.headers.get("access-control-allow-credentials") == "true"

    bad = client.options(
        f"{API}/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in bad.headers

    bad_get = client.get(f"{API}/health", headers={"Origin": "https://evil.example"})
    assert bad_get.status_code == 200
    assert "access-control-allow-origin" not in bad_get.headers


def test_auth_rate_limiting_and_window_reset(client, Session, monkeypatch):
    monkeypatch.setattr(settings, "auth_rate_limit_max_requests", 3)
    monkeypatch.setattr(settings, "auth_rate_limit_window_seconds", 60)

    for i in range(3):
        r = client.post(
            f"{API}/auth/login",
            json={"email": "nobody@test.example", "password": PASSWORD},
            headers={"X-Forwarded-For": f"198.51.100.{i}"},  # spoofed XFF must not bypass limit
        )
        assert r.status_code == 401

    limited = client.post(
        f"{API}/auth/login",
        json={"email": "nobody@test.example", "password": PASSWORD},
        headers={"X-Forwarded-For": "203.0.113.99"},
    )
    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "RATE_LIMITED"
    assert int(limited.headers["Retry-After"]) >= 1

    # Simulate window expiration and verify reset
    with Session() as db:
        db.execute(text("UPDATE auth_rate_limits SET window_start = now() - interval '120 seconds'"))
        db.commit()

    after_reset = client.post(f"{API}/auth/login", json={"email": "nobody@test.example", "password": PASSWORD})
    assert after_reset.status_code == 401


def test_websocket_origin_validation(client):
    with client.websocket_connect(f"{API}/ws/inventory", headers={"Origin": "http://localhost:3001"}) as ws:
        ws.send_text("ping")
        data = ws.receive_json()
        assert data["event"] == "BED_INVENTORY_UPDATE"

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{API}/ws/inventory", headers={"Origin": "https://evil.example"}):
            pass


def test_production_guards_for_console_email_and_demo_seed(Session, monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "jwt_secret", "a" * 32)
    monkeypatch.setattr(settings, "email_backend", "console")

    with pytest.raises(RuntimeError, match="Console email_backend"):
        asyncio.run(lifespan(app).__aenter__())

    with Session() as db:
        with pytest.raises(RuntimeError, match="Demo seed data"):
            seed(db)


def test_trusted_proxy_headers_only_trust_private_proxy_peers(monkeypatch):
    from starlette.requests import Request
    from app.rate_limit import _client_identifier

    def make_req(peer_ip: str, x_real_ip: str | None = None, xff: str | None = None) -> Request:
        headers = []
        if x_real_ip:
            headers.append((b"x-real-ip", x_real_ip.encode()))
        if xff:
            headers.append((b"x-forwarded-for", xff.encode()))
        return Request({"type": "http", "headers": headers, "client": (peer_ip, 12345)})

    monkeypatch.setattr(settings, "trust_proxy_headers", True)
    # Public peer cannot spoof X-Real-IP or X-Forwarded-For
    assert _client_identifier(make_req("198.51.100.10", x_real_ip="1.2.3.4", xff="5.6.7.8")) == "198.51.100.10"
    # Private Docker proxy peer uses X-Real-IP (and ignores X-Forwarded-For)
    assert _client_identifier(make_req("172.18.0.5", x_real_ip="203.0.113.42", xff="9.9.9.9")) == "203.0.113.42"
