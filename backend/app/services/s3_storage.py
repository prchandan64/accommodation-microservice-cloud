import uuid
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from ..config import settings
from ..errors import DomainError

ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MiB


def _get_s3_client():
    """Return an S3 client using the runtime IAM role / environment chain (no static keys)."""
    return boto3.client("s3", region_name=settings.aws_region)


def _normalized_images_prefix() -> str:
    prefix = (settings.s3_images_prefix or "images/").lstrip("/")
    if not prefix.endswith("/"):
        prefix += "/"
    if prefix.startswith("backups/"):
        raise DomainError(400, "INVALID_S3_PREFIX", "Image storage cannot target the backups prefix")
    return prefix


def upload_hostel_image(hostel_id: uuid.UUID, content_type: str, data: bytes) -> dict[str, Any]:
    """Validate and upload a hostel image under images/<hostel_id>/ in the private S3 bucket."""
    if not settings.s3_bucket_name:
        raise DomainError(503, "S3_NOT_CONFIGURED", "S3 image storage is not configured")

    ext = ALLOWED_IMAGE_TYPES.get((content_type or "").lower())
    if not ext:
        raise DomainError(400, "INVALID_IMAGE_TYPE", "Allowed image types: image/jpeg, image/png, image/webp")

    if not data or len(data) > MAX_IMAGE_BYTES:
        raise DomainError(400, "INVALID_IMAGE_SIZE", "Image must be non-empty and at most 5 MiB")

    prefix = _normalized_images_prefix()
    key = f"{prefix}{hostel_id}/{uuid.uuid4().hex}{ext}"

    client = _get_s3_client()
    try:
        client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=data,
            ContentType=content_type.lower(),
            ServerSideEncryption="AES256",
        )
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=settings.s3_presigned_ttl_seconds,
        )
    except (BotoCoreError, ClientError) as exc:
        raise DomainError(502, "S3_UPLOAD_FAILED", "Failed to store image in S3") from exc

    return {"key": key, "content_type": content_type.lower(), "size_bytes": len(data), "url": url}


def list_hostel_images(hostel_id: uuid.UUID) -> list[dict[str, Any]]:
    """List hostel images under images/<hostel_id>/ and return short-lived presigned GET URLs."""
    if not settings.s3_bucket_name:
        return []

    prefix = f"{_normalized_images_prefix()}{hostel_id}/"
    client = _get_s3_client()
    try:
        resp = client.list_objects_v2(Bucket=settings.s3_bucket_name, Prefix=prefix, MaxKeys=20)
        items = []
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/.keep") or key.endswith("/"):
                continue
            url = client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.s3_bucket_name, "Key": key},
                ExpiresIn=settings.s3_presigned_ttl_seconds,
            )
            items.append({
                "key": key,
                "size_bytes": obj.get("Size", 0),
                "last_modified": obj["LastModified"].isoformat() if obj.get("LastModified") else None,
                "url": url,
            })
        return items
    except (BotoCoreError, ClientError) as exc:
        raise DomainError(502, "S3_LIST_FAILED", "Failed to list hostel images from S3") from exc
