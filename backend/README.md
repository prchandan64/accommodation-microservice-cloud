# Accommodation Service (steps 2 to 5)

FastAPI + SQLAlchemy 2 + PostgreSQL. This part of the project contains:

| Step | What is here |
|---|---|
| 2. Database | `sql/schema.sql` (23 tables), Alembic migration, seed data, `docker-compose.yml` |
| 3. Models | `app/models.py` (generated from the database design) |
| 4. Bed booking engine | `app/services/booking.py`: hold, pay and allocate, cancel, expire |
| API for the booking flow | `app/api/booking.py`: availability, apply, pay, cancel, read application |
| 5. Login and roles | `app/services/auth.py`, `app/security.py`, `app/api/auth.py`, `app/api/admin.py`: register, email + password, 6-digit code, JWT, role guards, staff accounts |
| Tests | `tests/`: engine tests, many-students-at-once tests, login tests, API tests (they need PostgreSQL) |

Not built yet: the rest of the warden and admin endpoints (check-in, swaps, tickets, catalogue and fee management),
the outbox relay to RabbitMQ, the frontend, the occupancy forecaster.

## Run it

```bash
docker compose up -d                       # PostgreSQL on port 5432 (also creates the test database)
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head                       # creates the 23 tables from sql/schema.sql
python -m app.seed                         # demo hostels, beds, term, fees, 4 students, a warden, an admin (prints logins)
uvicorn app.main:app --reload              # http://localhost:8000/docs
```

If Alembic gives you trouble, load the schema directly instead of `alembic upgrade head`:

```bash
psql postgresql://accommodation:accommodation@localhost:5432/campus_mobility_accommodation -f sql/schema.sql
```

## Log in and try the booking flow

The seed creates these accounts (all with the password `Password123!`, development only):
`student1@example.test` (girl), `student2@example.test` (boy), `student3@example.test` (boy), `student4@example.test` (girl),
`warden1@example.test` (Boys Hostel 1) and `admin@example.test` (housing admin).

Login has two steps. While `EMAIL_BACKEND=console` the 6-digit code is printed in the server log
(look for `LOGIN CODE for ...`). For a real deployment set `EMAIL_BACKEND=smtp` and the `SMTP_*` settings.

```bash
B=localhost:8000/api/v1/accommodation
curl -H "Content-Type: application/json" -d '{"email":"student2@example.test","password":"Password123!"}' $B/auth/login
#   -> {"challenge_id": "...", "message": "A 6-digit code was sent to your email", ...}
curl -H "Content-Type: application/json" -d '{"challenge_id":"<challenge_id>","otp_code":"<code from the log>"}' $B/auth/verify-otp
#   -> {"access_token": "...", "role": "STUDENT", ...}

H="Authorization: Bearer <access_token>"
curl -H "$H" $B/availability                                   # note an inventory_id
curl -H "$H" -H "Content-Type: application/json" -d '{"inventory_id": "<inventory id>"}' $B/applications          # 201 HELD
curl -H "$H" -H "Content-Type: application/json" -d '{"payment_token": "tok_ok"}' $B/applications/<application id>/pay   # 200 ALLOCATED
```

`"payment_token": "tok_fail"` makes the mock gateway decline, so you can see the FAILED path.
A girl's account applying to the boys' hostel returns `403 GENDER_POLICY_MISMATCH`.
You can also click through everything at http://localhost:8000/docs (use the Authorize button with the token).

To create the first real housing admin (instead of the demo one): `python -m app.create_admin --email you@university.edu --name "Your Name"`.

## How login works

* `POST /auth/register` creates a student (the role is always STUDENT). Emails are stored in lower case.
* `POST /auth/login` checks email and password and sends a 6-digit code. An unknown email and a wrong password
  give the same answer, so nobody can find out which emails exist.
* `POST /auth/verify-otp` checks the code and returns a signed token (HS256 JWT, 60 minutes). A code works once,
  for 5 minutes, with 5 wrong guesses allowed. Only a keyed hash of the code is stored.
* `POST /auth/resend-otp` sends a new code (30 second cooldown) and cancels the old one.
* Every request re-reads the account, so suspending an account (`PATCH /admin/accounts/{id}/status`) locks the user out immediately.
* Passwords are hashed with Argon2. Set a long random `JWT_SECRET`; outside development the app refuses to start with the default.

Not done yet: a limit on password guesses per IP or email (put this in the API gateway or reverse proxy for now),
refresh tokens, and password reset by email.

## Run the tests

```bash
docker compose up -d
pytest -v
```

The tests use the `campus_mobility_accommodation_test` database and rebuild its schema each run.
They must run on real PostgreSQL because the engine depends on row locks and the no-overlap rule.

The most important ones are in `tests/test_concurrency.py`: 10 students apply for the last bed at
the same moment and exactly one gets it; 25 students apply for 5 beds and exactly 5 succeed; five
payments at once get five different beds.

## How double allocation is prevented

1. `hold_bed` takes a bed with one statement:
   `UPDATE bed_inventory SET beds_available = beds_available - 1, beds_held = beds_held + 1 WHERE inventory_id = :id AND beds_available >= 1`.
   If it changes 0 rows there is no bed, and the application is saved as REJECTED.
2. `pay_application` charges first, then chooses a real bed with `FOR UPDATE SKIP LOCKED`, so parallel
   payments never wait for or pick the same bed.
3. If two writers still clash, the database refuses: the exclusion constraint `alloc_no_bed_overlap`
   on `allocations`, the CHECK `beds_total = beds_available + beds_held + beds_allocated`, and the
   partial unique indexes (one live application per term, one live bed per student, one live charge per fee).
4. Every counter change happens in the same transaction as the status change it belongs to.

A background timer (every 60 seconds, `EXPIRY_JOB_SECONDS`) runs `expire_holds`, which returns the beds of
HELD applications whose 30 minutes (`HOLD_MINUTES`) ran out.

New error codes added by login (not in the API document yet): `EMAIL_ALREADY_REGISTERED`, `ENROLLMENT_ALREADY_REGISTERED`, `EMPLOYEE_CODE_TAKEN`, `EMAIL_FAILED`.

## Decisions still open (from the API document)

* Refund rule: cancelling an allocated, paid application inserts one REFUND row for the full rent + deposit (PENDING).
  Nothing sends it to the gateway yet.
* A failed payment ends the application (FAILED); the student applies again.
* No warden approval step before allocation.
