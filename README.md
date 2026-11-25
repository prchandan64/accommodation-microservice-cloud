# Accommodation Microservice — Student Mobility & Lifestyle Platform

Microservice 2 (Hostels and Housing) of the Student Mobility & Lifestyle Platform, providing campus housing discovery, bed allocation with PostgreSQL concurrency controls, warden check-in & maintenance operations, and housing administration.

---

## Roles & Features (Locally Implemented & Verified)

- **Student (`STUDENT`)**
  - Hostel catalogue, room types, and academic term browsing (`GET /hostels`, `/room-types`, `/terms`, `/availability`)
  - Client-side heuristic Room Recommender (`RoomRecommender.tsx`) over live availability
  - Bed reservation state machine: `APPLIED` -> `HELD` (30-min hold window + background expiry) -> `ALLOCATED` / `CANCELLED` / `EXPIRED`
  - **Simulated INR Payment Gateway** (`PaymentModal.tsx` + `MockPaymentGateway` using `tok_ok` / `tok_fail` — *academic simulation only; no real card details or real payments are processed*)
  - Digital Room Allotment Pass (`GET /allocations/{allocation_id}/pass` with object-level IDOR protection)
  - Room swap requests and maintenance ticket submission
- **Warden (`WARDEN`)**
  - Hostel-scoped expected arrivals & physical room check-in (`POST /warden/check-ins`)
  - Hostel-scoped room swap approvals/rejections and maintenance ticket management
- **Housing Admin (`HOUSING_ADMIN`)**
  - Live hostel occupancy ledger (`GET /admin/occupancy`)
  - Illustrative demand forecast (`GET /admin/forecast`, static projection)
  - Staff account creation and status management (`POST /admin/accounts`, `PATCH /admin/accounts/{id}/status`)

---

## Technology Stack

- **Frontend:** React `^19.3.1`, TypeScript `~7.0.2`, Vite `^8.3.6`, Tailwind CSS `^4.3.5`, `lucide-react`, `oxlint`
- **Backend:** Python `3.12`, FastAPI, Uvicorn, SQLAlchemy `2.0`, Psycopg `3`, Alembic `1.13+`, PyJWT (`HS256`), Argon2 (`argon2-cffi`)
- **Database:** PostgreSQL `16` (24 tables including `auth_rate_limits`, 6 SQL views, triggers, GiST exclusion constraint `alloc_no_bed_overlap`)
- **Containers & Reverse Proxy:** Docker, Docker Compose, Nginx `1.27-alpine`, Caddy `2-alpine`

---

## Repository Structure

```text
.
├── backend/                          # FastAPI microservice, Alembic migrations & pytest suite
│   ├── alembic/                      # Migrations 0001 -> 0002 -> 0003
│   ├── app/                          # API routers, services, ORM models, rate limiter, security
│   ├── tests/                        # 53 pytest tests (API, auth, booking, concurrency, ops, security)
│   ├── Dockerfile                    # Multi-stage Python 3.12 non-root runtime (uid=1001)
│   └── .env.example                  # Safe backend environment template
├── frontend/                         # React + TypeScript + Vite SPA
│   ├── src/                          # Components, AppContext (in-memory JWT), API client
│   ├── tests/                        # 7 Node test-runner unit/contract tests
│   ├── Dockerfile                    # Multi-stage Node 22 build -> Nginx 1.27 runtime
│   └── .env.example                  # Safe frontend environment template
├── database/                         # PostgreSQL DDL, views, test DB init & dev seed SQL
├── infrastructure/
│   └── accommodation-deploy/         # Production Compose, Caddyfile, Nginx & .env.accommodation.example
└── docs/                             # Local test evidence, architecture & readiness checklist
```

---

## Local Development & Docker Compose

### 1. Environment Setup
Copy the safe templates before running locally (never commit `.env` files):
- Backend: `backend/.env.example` -> `backend/.env`
- Frontend: `frontend/.env.example` -> `frontend/.env`
- Production template: `infrastructure/accommodation-deploy/.env.accommodation.example`

### 2. Run Full Stack with Docker Compose
```bash
docker compose up --build
```
- **Frontend:** `http://localhost:3000` (or `127.0.0.1:3001` with local-test override)
- **Backend API Docs (Swagger):** `http://localhost:8000/docs`
- **Health & Readiness Endpoints:**
  - `GET /api/v1/accommodation/health`
  - `GET /api/v1/accommodation/ready`
- **WebSocket:** `WS /api/v1/accommodation/ws/inventory`

> **Production Email Prerequisite:** Local development uses `EMAIL_BACKEND=console` (OTP logged to backend stdout). Outside development (`ENVIRONMENT != dev`), startup rejects `EMAIL_BACKEND=console` and requires valid `SMTP_*` configuration and a >=32-character `JWT_SECRET`.

---

## Testing Commands & Local Verification Results

- **Backend (`backend/` against PostgreSQL 16):**
  ```bash
  pytest -v
  ```
  Verified locally: **53 passed, 0 failed** (API, auth, booking engine, 5 concurrency tests, operations, and security regression tests).
- **Frontend (`frontend/`):**
  ```bash
  npm ci
  npm run lint
  npx tsc -b
  npm test
  npm run build
  ```
  Verified locally: `oxlint` (0 errors, 3 justified warnings), `tsc -b` (0 errors), `npm test` (**7 passed, 0 failed**), and Vite production build succeeded.

---

## Documentation & Planned Cloud Architecture

- [Local Test Evidence](docs/ACCOMMODATION_LOCAL_TEST_EVIDENCE.md)
- [Production Readiness Checklist](docs/ACCOMMODATION_PRODUCTION_READINESS_CHECKLIST.md)
- [Cloud Architecture & Deployment Guide](docs/ACCOMMODATION_CLOUD_ARCHITECTURE_AND_DEPLOYMENT.md)
- [Production Deployment Configs](infrastructure/accommodation-deploy/README.md)

> **Planned AWS Deployment (Not Yet Provisioned):** Target cloud architecture uses Amazon EC2 (Caddy + Nginx + FastAPI), Amazon RDS PostgreSQL 16, Amazon S3, CloudWatch/SNS, optional AWS Lambda, DuckDNS + Let's Encrypt HTTPS, Docker Hub, and GitHub Actions CI/CD.
