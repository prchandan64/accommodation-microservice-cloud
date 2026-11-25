# Accommodation Microservice — Production Readiness Checklist

> **Scope:** Tracks verified local readiness vs. remaining production & AWS cloud prerequisites. No AWS resources have been provisioned yet.

## 1. Completed Local Requirements (Verified)
- [x] **Docker & Healthcheck:** Backend `/api/v1/accommodation/health` check fixed; `db`, `backend`, and `frontend` start cleanly with `up --wait`.
- [x] **Non-Root Backend Container:** `backend/Dockerfile` runs as `uid=1001(appuser)`.
- [x] **Environment Variable Alignment:** `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `OTP_TTL_SECONDS`, `CORS_ORIGINS`, and `ENVIRONMENT` aligned with `backend/app/config.py`.
- [x] **Production Startup Guards:** `main.py` `lifespan` rejects `ENVIRONMENT != "dev"` if `JWT_SECRET` is empty/default/`< 32` chars, if `EMAIL_BACKEND == "console"`, or if `SMTP_HOST`/`SMTP_FROM` are missing. `seed.py` refuses demo seeding outside `dev`.
- [x] **Alembic Migrations:** Revisions `0001 -> 0002 -> 0003` verified inside `accommodation-ms-backend:latest` using `settings.get_effective_database_url()`.
- [x] **Authorization & IDOR:** Allotment pass IDOR fixed; cross-hostel Warden isolation enforced; client-side `switchRole` removed.
- [x] **Rate Limiting:** PostgreSQL-backed `auth_rate_limits` active on `/auth/register`, `/login`, `/verify-otp`, `/resend-otp`, `/password`.
- [x] **Nginx Proxy:** REST (`/api/`) and WebSocket (`/api/v1/accommodation/ws/`) verified.
- [x] **Frontend Quality & Tests:** `oxlint` (0 errors), `tsc -b` (0 errors), `npm test` (7/7), `npm audit` (0 vulns), `pytest` (53/53).
- [x] **Production Docker & Caddy Config:** `infrastructure/accommodation-deploy/` created and verified locally via `accommodation-prod-local` (`127.0.0.1:8081`).
- [x] **Readiness Endpoint (`/ready`):** DB connectivity + schema check (`200`/`503`) verified during DB outage/recovery.
- [x] **Bandit & Pip Remediation:** `Bandit` 0 Medium/High issues; `pip` upgraded to `>=26.2` (`26.3`) in `backend/Dockerfile`.

---

## 2. Remaining Production & Cloud Prerequisites (To Be Configured in Subsequent Steps)
- [ ] **Production `JWT_SECRET`:** Inject a cryptographically random >=32-byte secret via AWS Secrets Manager / SSM Parameter Store or CI/CD environment secrets.
- [ ] **Production Email (`SMTP_*` / Amazon SES):** Configure `EMAIL_BACKEND=smtp`, `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD`, and verified `SMTP_FROM` (e.g., Amazon SES SMTP credentials).
- [ ] **Production `CORS_ORIGINS`:** Set `CORS_ORIGINS` to the exact production `https://` frontend origin(s) (no `*`, no `http://localhost` in production).
- [ ] **Trusted Reverse Proxy (`TRUST_PROXY_HEADERS`):** Keep `TRUST_PROXY_HEADERS=false` unless deployed behind a trusted Nginx/Caddy/ALB layer that strips/overwrites `X-Real-IP` and `X-Forwarded-For` from untrusted clients. Only enable `TRUST_PROXY_HEADERS=true` once the proxy sanitizes these headers.
- [ ] **HTTPS & WSS:** Terminate TLS at ALB / Caddy / CloudFront so frontend uses `https://` and WebSocket uses `wss://`.
- [ ] **Managed Database (AWS RDS PostgreSQL 16):** Provision RDS in private subnets, enforce `sslmode=require`, run `alembic upgrade head` (do not run `seed.sql`), and create the initial admin via `python -m app.create_admin`.
- [ ] **Object Storage (Amazon S3):** Replace external Unsplash URLs in `mockData.ts` with S3-backed hostel image storage and presigned/CloudFront URLs.
- [ ] **Serverless & Monitoring:** Integrate AWS Lambda (e.g. outbox/notification/expiry integration) and CloudWatch Logs/Alarms.
- [ ] **CI/CD & Git:** Initialize Git repository, add `.github/workflows/` automated test/lint/build/deploy pipelines.
- [ ] **Base Image Patching:** Upgrade `pip` in `backend/Dockerfile` builder/runtime if desired to clear base-image `pip 25.0.1` `pip-audit` advisories.
