import io
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.config import settings
from tests.conftest import admin_with_login, student_with_login


def test_hostel_image_upload_requires_housing_admin(client: TestClient, Session, world):
    w = world()
    _, student_headers = student_with_login(Session)
    res = client.post(
        f"{settings.api_prefix}/admin/hostels/{w['hostel']}/images",
        headers=student_headers,
        files={"file": ("photo.png", io.BytesIO(b"fakepng"), "image/png")},
    )
    assert res.status_code == 403


def test_hostel_image_upload_validates_type_and_size(client: TestClient, Session, world, monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_name", "accommodation-media-516821890151-ap-south-1")
    w = world()
    _, admin_headers = admin_with_login(Session)

    bad_type = client.post(
        f"{settings.api_prefix}/admin/hostels/{w['hostel']}/images",
        headers=admin_headers,
        files={"file": ("evil.svg", io.BytesIO(b"<svg></svg>"), "image/svg+xml")},
    )
    assert bad_type.status_code == 400
    assert bad_type.json()["error"]["code"] == "INVALID_IMAGE_TYPE"

    oversized = client.post(
        f"{settings.api_prefix}/admin/hostels/{w['hostel']}/images",
        headers=admin_headers,
        files={"file": ("big.png", io.BytesIO(b"x" * (5 * 1024 * 1024 + 10)), "image/png")},
    )
    assert oversized.status_code == 400
    assert oversized.json()["error"]["code"] == "INVALID_IMAGE_SIZE"


def test_hostel_image_upload_and_list_uses_s3_images_prefix(client: TestClient, Session, world, monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_name", "accommodation-media-516821890151-ap-south-1")
    monkeypatch.setattr(settings, "s3_images_prefix", "images/")
    w = world()
    _, admin_headers = admin_with_login(Session)

    fake_s3 = MagicMock()
    fake_s3.generate_presigned_url.return_value = "https://example-presigned-s3.local/img.png"
    fake_s3.list_objects_v2.return_value = {
        "Contents": [{"Key": f"images/{w['hostel']}/abc.png", "Size": 123, "LastModified": None}]
    }

    with patch("app.services.s3_storage._get_s3_client", return_value=fake_s3):
        up = client.post(
            f"{settings.api_prefix}/admin/hostels/{w['hostel']}/images",
            headers=admin_headers,
            files={"file": ("hostel.png", io.BytesIO(b"pngdata"), "image/png")},
        )
        assert up.status_code == 201
        body = up.json()
        assert body["key"].startswith(f"images/{w['hostel']}/")
        assert body["url"] == "https://example-presigned-s3.local/img.png"
        fake_s3.put_object.assert_called_once()

        lst = client.get(f"{settings.api_prefix}/hostels/{w['hostel']}/images")
        assert lst.status_code == 200
        assert len(lst.json()["images"]) == 1
        assert lst.json()["images"][0]["key"] == f"images/{w['hostel']}/abc.png"
