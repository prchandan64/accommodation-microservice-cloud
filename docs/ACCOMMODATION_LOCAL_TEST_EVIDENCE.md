# Accommodation Microservice — Local Test Evidence

## 1. Testing Environment
- **Host OS:** Windows 11 Home Single Language (64-bit, `10.0.26300`)
- **Docker Engine / Compose:** Docker `29.7.2`, Docker Compose `v5.4.0` (Linux containers)
- **Backend Runtime:** `python:3.12-slim` (FastAPI, SQLAlchemy 2, Alembic `1.20.1`, Psycopg `3.3.9`)
- **Frontend Runtime:** `node:22-alpine` build -> `nginx:1.27-alpine` runtime (React `19.3.1`, TypeScript `7.0.2`, Vite `8.3.8`)
- **Database:** `postgres:16-alpine` (isolated Compose project `accommodation-ms`, loopback ports `127.0.0.1:3001`, `127.0.0.1:8001`, `127.0.0.1:5433`)

---

## 2. Local Architecture Summary
- **Nginx (`127.0.0.1:3001`):** Serves the React SPA and proxies `/api/` and `/api/v1/accommodation/ws/` (WebSocket upgrade) to `backend:8000`.
- **FastAPI (`127.0.0.1:8001`):** Exposes `/api/v1/accommodation/*` REST endpoints, `/api/v1/accommodation/ws/inventory` WebSocket, and runs as non-root `uid=1001(appuser)`.
- **PostgreSQL 16 (`127.0.0.1:5433`):** Hosts 24 tables (`23` domain tables + `auth_rate_limits`), `6` SQL views, `16` triggers, and GiST exclusion constraints (`alloc_no_bed_overlap`).

---

## 3. Automated Test Results
### Backend (`pytest`)
- **Command:** `pytest -v` against isolated PostgreSQL 16 (`campus_mobility_accommodation_test`)
- **Result:** **`50 passed, 0 failed, 0 skipped, 6 warnings in 17.04s`** (exit code `0`)
  - `tests/test_api.py`: 3 passed
  - `tests/test_auth.py`: 15 passed
  - `tests/test_booking_engine.py`: 16 passed
  - `tests/test_concurrency.py`: 5 passed (plus 10/10 sequential repetitions of `test_same_payment_sent_twice_at_once_charges_once` passed with 0 deadlocks)
  - `tests/test_operations.py`: 5 passed (including check-in role guard, ticket room validation, `/tickets/me` role isolation)
  - `tests/test_security.py`: 6 passed (IDOR on allotment pass, cross-hostel Warden isolation, CORS, PostgreSQL rate limiting, WebSocket origin validation, production email/seed guards)

### Frontend Quality & Unit Tests
- **`npm run lint` (`oxlint`):** `3 warnings, 0 errors` (exit `0`) — remaining 3 warnings in `AppContext.tsx` (`react/only-export-components` on `useApp` and `react/set-state-in-effect` on initial load/WS disconnect reset) are justified and unsuppressed.
- **`npx tsc -b`:** `0 errors` (exit `0`)
- **`npm test` (`node --experimental-strip-types --test tests/frontend.test.ts`):** **`7 passed, 0 failed`** (`186ms`)
- **`npm run build` (`vite build`):** Passed in `775ms` (`2145 modules transformed`).

---

## 4. Database Migration Verification
- **Alembic Revisions:** `0001` (initial 23-table schema) -> `0002` (SQLSTATE `23514` on `trg_check_bed_inventory_consistency`) -> `0003` (`auth_rate_limits` table).
- **Verified on Fresh Isolated DB (`campus_mobility_accommodation_migtest`):** `alembic upgrade 0002 && alembic upgrade head` reached `0003 (head)` cleanly, and repeated `alembic upgrade head` succeeded idempotently.
- **Note on Docker Init vs. Alembic:** `docker-compose.yml` mounts `database/schema.sql` and `database/seed.sql` into `/docker-entrypoint-initdb.d/` for first-time local container initialization, whereas production/RDS environments use `alembic upgrade head` (without `seed.sql`).

---

## 5. Dependency & Security Scan Results
- **Python (`pip-audit` in isolated `python:3.12-slim`):** `0` vulnerabilities in application packages; `pip 25.0.1` (base image tool, not an app runtime dependency) reported 12 advisories (6 CVEs, fixed in `pip>=26.2`).
- **Source Security (`bandit -r backend/app -ll`):** `0` High-severity issues; `4` Medium/Low-confidence `[B608]` alerts in `operations.py` for f-string `{where_clause}` using hardcoded literal clauses with bound `:actor_id`/`:hid` parameters (no user input interpolated).
- **Frontend (`npm audit --omit=dev` and `npm audit`):** `0` vulnerabilities.

---

## 6. Verified Browser E2E & Negative Workflows (Chromium)
- **Public Landing & Unauthenticated Protection:** Verified `Welcome to Accommodation Hub` on `http://127.0.0.1:3001/`, no role-switcher buttons, and `/admin` unauthenticated access exposes no admin console.
- **Student Registration, Login & 2FA OTP:** Registered `e2e_student_1@example.test` and `e2e_student_2@example.test`, verified wrong password (`401`), invalid OTP (`401`), and real backend 6-digit OTP verification (`200`).
- **Student Booking, Failure, Cancellation, Pass & Swaps:** Verified bed hold + countdown, simulated payment failure (`tok_fail` -> `402` + hold banner cleared + bed released), hold cancellation (`200`), simulated payment success (`tok_ok` -> `200` + `ALP-...` pass), Digital Allotment Pass, maintenance ticket creation, and room swap submission (`201`).
- **Warden Console:** Verified `e2e_warden@example.test` login, `Term Period` column (`25 Dec 2026 – 24 May 2027`, no `Invalid Date`), check-in (`201`), ticket status update (`IN_PROGRESS`), and swap approval (`APPROVED`).
- **Housing Admin Console:** Verified `e2e_admin@example.test` login, live occupancy table (`GET /admin/occupancy`), illustrative forecast tab (`GET /admin/forecast`), and staff creation/suspend/activate (`POST /admin/accounts`, `PATCH /admin/accounts/{id}/status`).
- **Offline, Recovery & Refresh:** Verified page reload clears in-memory JWT; verified `Backend Offline` banner with no fake data when backend is stopped, and full `API Live` recovery when restarted.

### Evidence Screenshots (`docs/evidence/local-testing/`)
- [01_student_otp_screen.png](./evidence/local-testing/01_student_otp_screen.png)
- [02_student_pass_and_warden_otp.png](./evidence/local-testing/02_student_pass_and_warden_otp.png)
- [03_warden_checkin_and_admin_otp.png](./evidence/local-testing/03_warden_checkin_and_admin_otp.png)
- [04_housing_admin_dashboard.png](./evidence/local-testing/04_housing_admin_dashboard.png)
- [05_swagger_and_unauth_admin_check.png](./evidence/local-testing/05_swagger_and_unauth_admin_check.png)
- [06_student_allocated_and_swap.png](./evidence/local-testing/06_student_allocated_and_swap.png)
- [07_warden_term_period_and_swap_approved.png](./evidence/local-testing/07_warden_term_period_and_swap_approved.png)
- [08_backend_offline_state.png](./evidence/local-testing/08_backend_offline_state.png)
- [09_public_landing_recovered.png](./evidence/local-testing/09_public_landing_recovered.png)

---

## 7. Known Limitations
- In-memory JWT storage clears on browser refresh (user must re-authenticate).
- `database/seed.sql` has fewer physical `beds` rows than `bed_inventory.beds_total` for `Double Sharing Premium AC` (exhausting physical beds before `beds_available` reaches `0` in extended local demo runs).
- `GET /admin/forecast` returns static illustrative projection data; `RoomRecommender.tsx` is a client-side heuristic; `PaymentModal.tsx` is a simulated academic gateway.
- `outbox_events` has no active RabbitMQ/SQS relay worker yet.
