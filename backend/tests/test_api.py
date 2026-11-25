from .conftest import API, student_with_login


def headers(Session):
    return student_with_login(Session)[1]




def test_full_booking_flow_over_http(client, Session, world):
    w = world(beds=2)
    h = headers(Session)

    items = client.get(f"{API}/availability", headers=h).json()["items"]
    assert len(items) == 1 and items[0]["beds_available"] == 2

    r = client.post(f"{API}/applications", json={"inventory_id": str(w["inventory"])}, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "HELD" and body["amount_due"]["total"] == "55000.00"
    app_id = body["application_id"]

    r = client.post(f"{API}/applications/{app_id}/pay", json={"payment_token": "tok_ok"}, headers=h)
    assert r.status_code == 200 and r.json()["status"] == "ALLOCATED"
    assert r.json()["allocation"]["allotment_pass_code"].startswith("ALP-")

    r = client.get(f"{API}/applications/{app_id}", headers=h)
    assert r.json()["allocation"] is not None

    r = client.post(f"{API}/applications/{app_id}/cancel", json={"reason": "changed plans"}, headers=h)
    assert r.status_code == 200 and r.json()["refund_initiated"] is True


def test_errors_use_one_shape(client, Session, world):
    w = world(beds=0)
    r = client.post(f"{API}/applications", json={"inventory_id": str(w["inventory"])})
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHENTICATED"

    h = headers(Session)
    r = client.post(f"{API}/applications", json={"inventory_id": str(w["inventory"])}, headers=h)
    assert r.status_code == 409 and r.json()["error"]["code"] == "NO_BEDS_AVAILABLE"

    r = client.post(f"{API}/applications", json={"inventory_id": "not-a-uuid"}, headers=h)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_health(client):
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert body["service"] == "Accommodation Microservice"
    assert body["currency"] == "INR"


def test_ready_and_db_failure_returns_503(client, Session, monkeypatch):
    from app import main as app_main

    # Point readiness check to the test Session factory
    monkeypatch.setattr(app_main, "SessionLocal", Session)
    r = client.get(f"{API}/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ready", "database": "connected"}

    def broken_session():
        raise RuntimeError("db down")

    monkeypatch.setattr(app_main, "SessionLocal", broken_session)
    r_fail = client.get(f"{API}/ready")
    assert r_fail.status_code == 503
    assert r_fail.json() == {"status": "not_ready", "database": "unavailable"}
