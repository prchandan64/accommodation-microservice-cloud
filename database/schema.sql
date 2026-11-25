-- =====================================================================
-- Accommodation Microservice Database DDL (PostgreSQL 15+)
-- Database: campus_mobility_accommodation
-- Platform: Student Mobility & Lifestyle Platform
-- Microservice 2: Hostels and Housing
-- =====================================================================

-- Extensions required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- Required for GiST exclusion constraint on bed allocations

-- ---------------------------------------------------------------------
-- Trigger Function: Automatic updated_at timestamp management
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Trigger Function: Bed Inventory Total Consistency Validation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_check_bed_inventory_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.beds_total <> (NEW.beds_available + NEW.beds_held + NEW.beds_allocated) THEN
    RAISE EXCEPTION 'Inventory integrity violated: beds_total (%) must equal available (%) + held (%) + allocated (%)',
      NEW.beds_total, NEW.beds_available, NEW.beds_held, NEW.beds_allocated
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- SECTION A: ACCOUNTS AND PEOPLE
-- =====================================================================

-- 1. Authentication Accounts
CREATE TABLE IF NOT EXISTS accommodation_auth_accounts (
  account_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  role            VARCHAR(15) NOT NULL CHECK (role IN ('STUDENT', 'WARDEN', 'HOUSING_ADMIN')),
  full_name       VARCHAR(120) NOT NULL,
  account_status  VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' 
                  CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE accommodation_auth_accounts IS 'User credentials, roles, and status for Student, Warden, and Housing Admin.';
COMMENT ON COLUMN accommodation_auth_accounts.role IS 'Role-based access: STUDENT, WARDEN, HOUSING_ADMIN.';

-- 2. Email OTP Challenges (2-Factor Authentication)
CREATE TABLE IF NOT EXISTS email_otp_challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES accommodation_auth_accounts(account_id) ON DELETE CASCADE,
  otp_hash     VARCHAR(255) NOT NULL,
  attempts     SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  is_used      BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_otp_account_created ON email_otp_challenges (account_id, created_at DESC);

-- 2b. Authentication Rate Limit Buckets
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_key   VARCHAR(128) PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count    INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits (window_start);
COMMENT ON TABLE email_otp_challenges IS 'One-time 6-digit verification codes sent for 2FA login.';

-- 3. Student Profiles
CREATE TABLE IF NOT EXISTS students (
  student_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL UNIQUE REFERENCES accommodation_auth_accounts(account_id) ON DELETE CASCADE,
  enrollment_no VARCHAR(30) NOT NULL UNIQUE,
  gender        VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  course        VARCHAR(100),
  year_of_study SMALLINT CHECK (year_of_study BETWEEN 1 AND 6),
  phone         VARCHAR(20),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE students IS 'Student profiles linking student enrollment and gender policies for hostel eligibility.';

-- =====================================================================
-- SECTION B: HOSTEL CATALOGUE
-- =====================================================================

-- 4. Hostels
CREATE TABLE IF NOT EXISTS hostels (
  hostel_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_code   VARCHAR(20) NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  gender_policy VARCHAR(10) NOT NULL CHECK (gender_policy IN ('MALE', 'FEMALE', 'MIXED')),
  address       VARCHAR(255),
  latitude      NUMERIC(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude     NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
  description   TEXT,
  status        VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE hostels IS 'Hostel complexes with enforced gender policies and geo-coordinates.';

-- 5. Wardens
CREATE TABLE IF NOT EXISTS wardens (
  warden_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL UNIQUE REFERENCES accommodation_auth_accounts(account_id) ON DELETE CASCADE,
  hostel_id     UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE RESTRICT,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  status        VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE wardens IS 'Hostel wardens assigned to supervise specific hostels, manage check-ins and room swaps.';

-- 6. Blocks
CREATE TABLE IF NOT EXISTS blocks (
  block_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id  UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE CASCADE,
  block_code VARCHAR(20) NOT NULL,
  name       VARCHAR(80) NOT NULL,
  floors     SMALLINT NOT NULL DEFAULT 1 CHECK (floors > 0),
  status     VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (hostel_id, block_code)
);

COMMENT ON TABLE blocks IS 'Individual wings or buildings inside a hostel complex.';

-- 7. Room Types
CREATE TABLE IF NOT EXISTS room_types (
  room_type_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(60) NOT NULL UNIQUE,
  bed_count             SMALLINT NOT NULL CHECK (bed_count > 0),
  has_attached_bathroom BOOLEAN NOT NULL DEFAULT FALSE,
  is_ac                 BOOLEAN NOT NULL DEFAULT FALSE,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE room_types IS 'Catalogue of room configurations (single, double, triple sharing, AC, attached bath).';

-- 8. Rooms
CREATE TABLE IF NOT EXISTS rooms (
  room_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id     UUID NOT NULL REFERENCES blocks(block_id) ON DELETE RESTRICT,
  room_type_id UUID NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
  room_number  VARCHAR(10) NOT NULL,
  floor        SMALLINT NOT NULL CHECK (floor >= 0),
  status       VARCHAR(18) NOT NULL DEFAULT 'AVAILABLE'
               CHECK (status IN ('AVAILABLE', 'UNDER_MAINTENANCE', 'CLOSED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (block_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_type_status ON rooms (room_type_id, status);
COMMENT ON TABLE rooms IS 'Physical rooms mapped to blocks and room types.';

-- 9. Beds
CREATE TABLE IF NOT EXISTS beds (
  bed_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  bed_label  VARCHAR(10) NOT NULL,
  status     VARCHAR(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'OUT_OF_SERVICE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (room_id, bed_label)
);

COMMENT ON TABLE beds IS 'Individual beds which are the atomic allocatable units.';

-- 10. Amenities
CREATE TABLE IF NOT EXISTS amenities (
  amenity_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(60) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE amenities IS 'Features provided such as High-Speed Wi-Fi, Geyser, Study Table, AC.';

-- 11. Room Type Amenities (Many-to-Many join)
CREATE TABLE IF NOT EXISTS room_type_amenities (
  room_type_id UUID NOT NULL REFERENCES room_types(room_type_id) ON DELETE CASCADE,
  amenity_id   UUID NOT NULL REFERENCES amenities(amenity_id) ON DELETE CASCADE,
  PRIMARY KEY (room_type_id, amenity_id)
);

-- =====================================================================
-- SECTION C: TERMS, FEES AND BED INVENTORY
-- =====================================================================

-- 12. Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
  term_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(60) NOT NULL UNIQUE,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  applications_open_at  TIMESTAMPTZ NOT NULL,
  applications_close_at TIMESTAMPTZ NOT NULL,
  status                VARCHAR(10) NOT NULL DEFAULT 'UPCOMING'
                        CHECK (status IN ('UPCOMING', 'OPEN', 'ONGOING', 'COMPLETED')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (end_date > start_date),
  CHECK (applications_close_at > applications_open_at)
);

COMMENT ON TABLE academic_terms IS 'Semesters or intake terms with booking application time windows.';

-- 13. Fee Schedules (in INR)
CREATE TABLE IF NOT EXISTS fee_schedules (
  fee_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id        UUID NOT NULL REFERENCES academic_terms(term_id) ON DELETE CASCADE,
  room_type_id   UUID NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
  rent_amount    NUMERIC(10,2) NOT NULL CHECK (rent_amount >= 0),
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (deposit_amount >= 0),
  currency       CHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  created_by     UUID REFERENCES accommodation_auth_accounts(account_id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (term_id, room_type_id)
);

COMMENT ON TABLE fee_schedules IS 'Term pricing per room type: Rent and Refundable Caution Deposit in INR.';

-- 14. Bed Inventory Pool
CREATE TABLE IF NOT EXISTS bed_inventory (
  inventory_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id      UUID NOT NULL REFERENCES hostels(hostel_id) ON DELETE CASCADE,
  room_type_id   UUID NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
  term_id        UUID NOT NULL REFERENCES academic_terms(term_id) ON DELETE CASCADE,
  beds_total     SMALLINT NOT NULL CHECK (beds_total >= 0),
  beds_available SMALLINT NOT NULL CHECK (beds_available >= 0),
  beds_held      SMALLINT NOT NULL DEFAULT 0 CHECK (beds_held >= 0),
  beds_allocated SMALLINT NOT NULL DEFAULT 0 CHECK (beds_allocated >= 0),
  version        INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (hostel_id, room_type_id, term_id),
  CHECK (beds_total = beds_available + beds_held + beds_allocated)
);

CREATE TRIGGER trg_bed_inventory_consistency
BEFORE INSERT OR UPDATE ON bed_inventory
FOR EACH ROW EXECUTE FUNCTION trg_check_bed_inventory_consistency();

COMMENT ON TABLE bed_inventory IS 'Atomic inventory counter guaranteeing beds_total = available + held + allocated.';

-- =====================================================================
-- SECTION D: APPLICATIONS AND ALLOCATION
-- =====================================================================

-- 15. Hostel Applications
CREATE TABLE IF NOT EXISTS hostel_applications (
  application_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  term_id         UUID NOT NULL REFERENCES academic_terms(term_id) ON DELETE RESTRICT,
  inventory_id    UUID NOT NULL REFERENCES bed_inventory(inventory_id) ON DELETE RESTRICT,
  status          VARCHAR(10) NOT NULL DEFAULT 'APPLIED'
                  CHECK (status IN ('APPLIED', 'HELD', 'ALLOCATED', 'REJECTED', 'EXPIRED', 'FAILED', 'CANCELLED')),
  hold_expires_at TIMESTAMPTZ,
  status_reason   VARCHAR(255),
  remarks         TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  decided_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (status <> 'HELD' OR hold_expires_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_application_student_term_live 
ON hostel_applications (student_id, term_id)
WHERE status IN ('APPLIED', 'HELD', 'ALLOCATED');

CREATE INDEX IF NOT EXISTS idx_application_hold_expiry 
ON hostel_applications (hold_expires_at) 
WHERE status = 'HELD';

CREATE INDEX IF NOT EXISTS idx_application_inventory 
ON hostel_applications (inventory_id, status);

COMMENT ON TABLE hostel_applications IS 'Student booking requests tracking lifecycle from APPLIED -> HELD (30 mins) -> ALLOCATED.';

-- 16. Bed Allocations
CREATE TABLE IF NOT EXISTS allocations (
  allocation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID NOT NULL UNIQUE REFERENCES hostel_applications(application_id) ON DELETE RESTRICT,
  student_id          UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  bed_id              UUID NOT NULL REFERENCES beds(bed_id) ON DELETE RESTRICT,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              VARCHAR(12) NOT NULL DEFAULT 'ALLOCATED'
                      CHECK (status IN ('ALLOCATED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
  allotment_pass_code VARCHAR(30) NOT NULL UNIQUE,
  allocated_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  released_at         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (end_date > start_date),
  -- Exclusion constraint preventing double booking of the same bed across overlapping dates
  CONSTRAINT alloc_no_bed_overlap EXCLUDE USING GIST (
    bed_id WITH =, 
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status IN ('ALLOCATED', 'CHECKED_IN'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alloc_student_live 
ON allocations (student_id)
WHERE status IN ('ALLOCATED', 'CHECKED_IN');

CREATE INDEX IF NOT EXISTS idx_alloc_bed ON allocations (bed_id);

COMMENT ON TABLE allocations IS 'Physical bed assignment protected by GiST exclusion constraint against overlapping dates.';

-- 17. Room Swap Requests
CREATE TABLE IF NOT EXISTS room_swap_requests (
  swap_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES allocations(allocation_id) ON DELETE RESTRICT,
  reason        VARCHAR(255) NOT NULL,
  new_bed_id    UUID REFERENCES beds(bed_id) ON DELETE SET NULL,
  status        VARCHAR(10) NOT NULL DEFAULT 'REQUESTED'
                CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
  handled_by    UUID REFERENCES wardens(warden_id) ON DELETE SET NULL,
  handled_at    TIMESTAMPTZ,
  decision_note VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_swap_allocation_status ON room_swap_requests (allocation_id, status);
COMMENT ON TABLE room_swap_requests IS 'Student requests to change beds, reviewed and decided by the hostel warden.';

-- 18. Check-ins & Room Condition
CREATE TABLE IF NOT EXISTS check_ins (
  check_in_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id      UUID NOT NULL UNIQUE REFERENCES allocations(allocation_id) ON DELETE RESTRICT,
  warden_id          UUID NOT NULL REFERENCES wardens(warden_id) ON DELETE RESTRICT,
  checked_in_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  room_condition     VARCHAR(15) NOT NULL CHECK (room_condition IN ('GOOD', 'FAIR', 'NEEDS_REPAIR')),
  condition_notes    TEXT,
  checked_out_at     TIMESTAMPTZ,
  checkout_condition VARCHAR(15) CHECK (checkout_condition IN ('GOOD', 'FAIR', 'NEEDS_REPAIR')),
  is_simulated       BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE check_ins IS 'Physical arrival inspection log certifying room condition upon entry and exit.';

-- =====================================================================
-- SECTION E: PAYMENTS & FINANCIAL LEDGER
-- =====================================================================

-- 19. Payment Records (INR)
CREATE TABLE IF NOT EXISTS payment_records (
  payment_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES hostel_applications(application_id) ON DELETE RESTRICT,
  student_id            UUID NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  fee_type              VARCHAR(10) NOT NULL CHECK (fee_type IN ('RENT', 'DEPOSIT', 'REFUND')),
  amount                NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency              CHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status                VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  transaction_reference VARCHAR(80) UNIQUE,
  failure_reason        VARCHAR(255),
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_application_fee_live 
ON payment_records (application_id, fee_type)
WHERE status IN ('PENDING', 'SUCCESS');

CREATE INDEX IF NOT EXISTS idx_payment_student 
ON payment_records (student_id, created_at DESC);

COMMENT ON TABLE payment_records IS 'Financial ledger of Rent, Security Deposit, and Refund transactions in INR.';

-- =====================================================================
-- SECTION F: MAINTENANCE & INCIDENT MANAGEMENT
-- =====================================================================

-- 20. Maintenance Tickets
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  ticket_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id              UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  raised_by_student_id UUID REFERENCES students(student_id) ON DELETE SET NULL,
  raised_by_warden_id  UUID REFERENCES wardens(warden_id) ON DELETE SET NULL,
  category             VARCHAR(12) NOT NULL
                       CHECK (category IN ('PLUMBING', 'ELECTRICAL', 'FURNITURE', 'CLEANING', 'NETWORK', 'OTHER')),
  priority             VARCHAR(8) NOT NULL DEFAULT 'MEDIUM'
                       CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  title                VARCHAR(120) NOT NULL,
  description          TEXT,
  status               VARCHAR(12) NOT NULL DEFAULT 'OPEN'
                       CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to          VARCHAR(120),
  resolution_notes     TEXT,
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (num_nonnulls(raised_by_student_id, raised_by_warden_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_ticket_room ON maintenance_tickets (room_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_priority ON maintenance_tickets (status, priority);

COMMENT ON TABLE maintenance_tickets IS 'Maintenance desk for reporting plumbing, electrical, furniture, network issues.';

-- =====================================================================
-- SECTION G: SYSTEM, MESSAGING & AUDIT LOGS
-- =====================================================================

-- 21. Transactional Outbox Events (Reliable Messaging for RabbitMQ)
CREATE TABLE IF NOT EXISTS outbox_events (
  event_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type   VARCHAR(30) NOT NULL,
  aggregate_id     UUID NOT NULL,
  event_type       VARCHAR(80) NOT NULL,
  payload          JSONB NOT NULL,
  correlation_id   UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  published_at     TIMESTAMPTZ,
  publish_attempts SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished 
ON outbox_events (created_at) 
WHERE published_at IS NULL;

COMMENT ON TABLE outbox_events IS 'Transactional outbox table guaranteeing at-least-once event delivery to RabbitMQ.';

-- 22. Inbox / Processed Events (Idempotency Receiver)
CREATE TABLE IF NOT EXISTS processed_events (
  event_id     UUID NOT NULL,
  consumer     VARCHAR(60) NOT NULL,
  event_type   VARCHAR(80) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (event_id, consumer)
);

COMMENT ON TABLE processed_events IS 'Deduplication inbox preventing duplicate processing of published events.';

-- 23. Security & Operational Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id UUID REFERENCES accommodation_auth_accounts(account_id) ON DELETE SET NULL,
  actor_role       VARCHAR(15),
  action           VARCHAR(60) NOT NULL,
  entity_type      VARCHAR(40) NOT NULL,
  entity_id        UUID,
  details          JSONB,
  ip_address       VARCHAR(45),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);

COMMENT ON TABLE audit_logs IS 'Append-only ledger of warden inspections, room swaps, admin configuration, and security events.';

-- ---------------------------------------------------------------------
-- Automated updated_at triggers on all mutable entities
-- ---------------------------------------------------------------------
DO $$
DECLARE 
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
      'accommodation_auth_accounts', 'students', 'wardens', 'hostels', 'room_types',
      'rooms', 'academic_terms', 'fee_schedules', 'bed_inventory',
      'hostel_applications', 'allocations', 'room_swap_requests', 'payment_records',
      'maintenance_tickets'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;

-- =====================================================================
-- SECTION H: ANALYTICAL & OPERATIONAL SQL VIEWS
-- =====================================================================

-- View 1: Student Available Bed Search
CREATE OR REPLACE VIEW v_student_available_beds AS
SELECT 
    h.hostel_id,
    h.name AS hostel_name,
    h.hostel_code,
    h.gender_policy,
    rt.room_type_id,
    rt.name AS room_type_name,
    rt.bed_count,
    rt.is_ac,
    rt.has_attached_bathroom,
    t.term_id,
    t.name AS term_name,
    i.inventory_id,
    i.beds_available,
    i.beds_total,
    f.rent_amount,
    f.deposit_amount,
    f.currency,
    (f.rent_amount + f.deposit_amount) AS total_initial_fee
FROM bed_inventory i
JOIN hostels h ON h.hostel_id = i.hostel_id
JOIN room_types rt ON rt.room_type_id = i.room_type_id
JOIN academic_terms t ON t.term_id = i.term_id
LEFT JOIN fee_schedules f ON f.term_id = i.term_id AND f.room_type_id = i.room_type_id
WHERE t.status = 'OPEN' 
  AND h.status = 'ACTIVE' 
  AND i.beds_available > 0;

COMMENT ON VIEW v_student_available_beds IS 'Searchable bed vacancies with pricing in INR for open booking terms.';

-- View 2: Student Digital Room Allotment Pass
CREATE OR REPLACE VIEW v_student_allotment_pass AS
SELECT 
    a.allocation_id,
    a.allotment_pass_code,
    a.status AS allocation_status,
    s.student_id,
    acc.full_name AS student_name,
    s.enrollment_no,
    s.gender,
    s.course,
    s.phone AS student_phone,
    h.name AS hostel_name,
    h.gender_policy AS hostel_gender_policy,
    bl.block_code,
    bl.name AS block_name,
    r.room_number,
    r.floor,
    rt.name AS room_type_name,
    rt.is_ac,
    b.bed_label,
    a.start_date,
    a.end_date,
    a.allocated_at,
    w.employee_code AS warden_code,
    w_acc.full_name AS warden_name,
    w.phone AS warden_phone
FROM allocations a
JOIN students s ON s.student_id = a.student_id
JOIN accommodation_auth_accounts acc ON acc.account_id = s.account_id
JOIN beds b ON b.bed_id = a.bed_id
JOIN rooms r ON r.room_id = b.room_id
JOIN blocks bl ON bl.block_id = r.block_id
JOIN hostels h ON h.hostel_id = bl.hostel_id
JOIN room_types rt ON rt.room_type_id = r.room_type_id
LEFT JOIN wardens w ON w.hostel_id = h.hostel_id AND w.status = 'ACTIVE'
LEFT JOIN accommodation_auth_accounts w_acc ON w_acc.account_id = w.account_id
WHERE a.status IN ('ALLOCATED', 'CHECKED_IN');

COMMENT ON VIEW v_student_allotment_pass IS 'Comprehensive digital room pass details with student, room, bed and warden contacts.';

-- View 3: Warden Expected Arrivals & Check-in Desk
CREATE OR REPLACE VIEW v_warden_expected_arrivals AS
SELECT 
    a.allocation_id,
    a.allotment_pass_code,
    h.hostel_id,
    h.name AS hostel_name,
    bl.block_code,
    r.room_number,
    b.bed_label,
    s.student_id,
    acc.full_name AS student_name,
    s.enrollment_no,
    s.phone AS student_phone,
    a.start_date,
    a.end_date,
    a.status AS allocation_status,
    ci.check_in_id,
    ci.room_condition,
    ci.checked_in_at
FROM allocations a
JOIN students s ON s.student_id = a.student_id
JOIN accommodation_auth_accounts acc ON acc.account_id = s.account_id
JOIN beds b ON b.bed_id = a.bed_id
JOIN rooms r ON r.room_id = b.room_id
JOIN blocks bl ON bl.block_id = r.block_id
JOIN hostels h ON h.hostel_id = bl.hostel_id
LEFT JOIN check_ins ci ON ci.allocation_id = a.allocation_id
ORDER BY a.start_date ASC, r.room_number ASC;

COMMENT ON VIEW v_warden_expected_arrivals IS 'Check-in management list for wardens to inspect arriving students and record room condition.';

-- View 4: Warden Maintenance Queue
CREATE OR REPLACE VIEW v_warden_maintenance_queue AS
SELECT 
    mt.ticket_id,
    h.hostel_id,
    h.name AS hostel_name,
    bl.block_code,
    r.room_number,
    mt.category,
    mt.priority,
    mt.title,
    mt.description,
    mt.status,
    mt.assigned_to,
    mt.created_at,
    CASE mt.priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END AS priority_rank,
    s_acc.full_name AS raised_by_student_name,
    w_acc.full_name AS raised_by_warden_name
FROM maintenance_tickets mt
JOIN rooms r ON r.room_id = mt.room_id
JOIN blocks bl ON bl.block_id = r.block_id
JOIN hostels h ON h.hostel_id = bl.hostel_id
LEFT JOIN students s ON s.student_id = mt.raised_by_student_id
LEFT JOIN accommodation_auth_accounts s_acc ON s_acc.account_id = s.account_id
LEFT JOIN wardens w ON w.warden_id = mt.raised_by_warden_id
LEFT JOIN accommodation_auth_accounts w_acc ON w_acc.account_id = w.account_id
WHERE mt.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')
ORDER BY priority_rank ASC, mt.created_at ASC;

COMMENT ON VIEW v_warden_maintenance_queue IS 'Prioritized maintenance ticket queue for warden and maintenance technician dispatch.';

-- View 5: Housing Admin Campus Occupancy Dashboard
CREATE OR REPLACE VIEW v_admin_hostel_occupancy AS
SELECT 
    h.hostel_id,
    h.name AS hostel_name,
    h.gender_policy,
    t.term_id,
    t.name AS term_name,
    SUM(i.beds_total) AS total_capacity,
    SUM(i.beds_available) AS available_beds,
    SUM(i.beds_held) AS held_beds,
    SUM(i.beds_allocated) AS allocated_beds,
    SUM(i.beds_allocated + i.beds_held) AS total_occupied_and_held,
    ROUND(
        100.0 * SUM(i.beds_allocated + i.beds_held) / NULLIF(SUM(i.beds_total), 0), 
        1
    ) AS occupancy_percentage
FROM bed_inventory i
JOIN hostels h ON h.hostel_id = i.hostel_id
JOIN academic_terms t ON t.term_id = i.term_id
GROUP BY h.hostel_id, h.name, h.gender_policy, t.term_id, t.name;

COMMENT ON VIEW v_admin_hostel_occupancy IS 'High-level occupancy percentages per hostel complex for housing admin dashboard & AI forecaster.';

-- View 6: Financial Revenue Ledger (INR)
CREATE OR REPLACE VIEW v_admin_revenue_ledger AS
SELECT 
    t.term_id,
    t.name AS term_name,
    p.fee_type,
    p.currency,
    COUNT(p.payment_id) AS transaction_count,
    SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END) AS total_collected,
    SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END) AS total_pending,
    SUM(CASE WHEN p.status = 'REFUNDED' THEN p.amount ELSE 0 END) AS total_refunded
FROM payment_records p
JOIN hostel_applications ha ON ha.application_id = p.application_id
JOIN academic_terms t ON t.term_id = ha.term_id
GROUP BY t.term_id, t.name, p.fee_type, p.currency;

COMMENT ON VIEW v_admin_revenue_ledger IS 'Term-wise financial collections, pending dues, and security deposit refunds in INR.';
