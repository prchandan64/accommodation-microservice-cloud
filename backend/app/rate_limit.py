"""PostgreSQL-backed authentication rate limiter (multi-process safe, no Redis required)."""
from __future__ import annotations

import hashlib
import ipaddress
from fastapi import Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .errors import DomainError


_TRUSTED_PROXY_NETS = (
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
)


def _is_trusted_proxy_peer(host: str | None) -> bool:
    """Only trust forwarded headers when the direct TCP peer is a loopback or RFC1918/ULA proxy."""
    if not host:
        return False
    try:
        ip = ipaddress.ip_address(host)
        return any(ip in net for net in _TRUSTED_PROXY_NETS)
    except ValueError:
        return False


def _client_identifier(request: Request) -> str:
    """Resolve client IP without trusting arbitrary client-supplied X-Forwarded-For."""
    peer_host = request.client.host if request.client and request.client.host else None
    if settings.trust_proxy_headers and _is_trusted_proxy_peer(peer_host):
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()[:64]
    if peer_host:
        return peer_host[:64]
    return "unknown"


def check_auth_rate_limit(request: Request, db: Session, action: str) -> None:
    if not settings.auth_rate_limit_enabled:
        return

    client_ip = _client_identifier(request)
    raw_key = f"{action}:{client_ip}"
    bucket_key = hashlib.sha256(raw_key.encode()).hexdigest()[:64]
    window = max(1, settings.auth_rate_limit_window_seconds)
    limit = max(1, settings.auth_rate_limit_max_requests)

    # Opportunistic bounded cleanup of stale buckets older than 2x window + 5 minutes
    db.execute(
        text(
            """DELETE FROM auth_rate_limits
                WHERE window_start + make_interval(secs => CAST(:stale AS integer)) < now()"""
        ),
        {"stale": window * 2 + 300},
    )

    row = db.execute(
        text(
            """INSERT INTO auth_rate_limits (bucket_key, window_start, hit_count)
               VALUES (:k, now(), 1)
               ON CONFLICT (bucket_key) DO UPDATE
                 SET hit_count = CASE
                       WHEN auth_rate_limits.window_start + make_interval(secs => CAST(:win AS integer)) <= now() THEN 1
                       ELSE auth_rate_limits.hit_count + 1
                     END,
                     window_start = CASE
                       WHEN auth_rate_limits.window_start + make_interval(secs => CAST(:win AS integer)) <= now() THEN now()
                       ELSE auth_rate_limits.window_start
                     END
               RETURNING hit_count,
                         GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => CAST(:win AS integer)) - now()))))::integer AS retry_after"""
        ),
        {"k": bucket_key, "win": window},
    ).mappings().one()
    db.commit()

    if row["hit_count"] > limit:
        raise DomainError(
            429,
            "RATE_LIMITED",
            "Too many authentication requests. Please try again later.",
            {"retry_after_seconds": int(row["retry_after"])},
        )
