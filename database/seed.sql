-- =====================================================================
-- Accommodation Microservice Seed Data (PostgreSQL 15+)
-- Database: campus_mobility_accommodation
-- University: Indian Institute of Technology / National Campus
-- Password for all seed accounts: Password123!
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ACCOUNTS (Students, Wardens, Housing Admin)
-- ---------------------------------------------------------------------
-- Standard argon2 hash for demo password 'Password123!'
-- $argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA

INSERT INTO accommodation_auth_accounts (account_id, email, hashed_password, role, full_name, account_status)
VALUES
  -- Housing Admin
  ('11111111-1111-1111-1111-111111111111', 'admin@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'HOUSING_ADMIN', 'Prof. Arvind Deshmukh (Chief Housing Warden)', 'ACTIVE'),
  
  -- Wardens
  ('22222222-2222-2222-2222-222222222221', 'warden1@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'WARDEN', 'Dr. Suresh Kumar (Warden - Kaveri)', 'ACTIVE'),
  ('22222222-2222-2222-2222-222222222222', 'warden2@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'WARDEN', 'Prof. Sunita Reddy (Warden - Ganga)', 'ACTIVE'),
  ('22222222-2222-2222-2222-222222222223', 'warden3@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'WARDEN', 'Mr. Rajesh Iyer (Warden - Yamuna)', 'ACTIVE'),

  -- Students
  ('33333333-3333-3333-3333-333333333331', 'student1@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'STUDENT', 'Ananya Sharma', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333332', 'student2@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'STUDENT', 'Rohan Verma', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333333', 'student3@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'STUDENT', 'Arjun Patel', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333334', 'student4@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'STUDENT', 'Pooja Nair', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333335', 'student5@example.test', '$argon2id$v=19$m=65536,t=3,p=4$7xO3J7YV8QZ2u4N9kW1rTg$wZ7oXb1TqN6f8Yp2U0vXcA', 'STUDENT', 'Nikhil Hegde', 'ACTIVE')
ON CONFLICT (account_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. STUDENT PROFILES
-- ---------------------------------------------------------------------
INSERT INTO students (student_id, account_id, enrollment_no, gender, course, year_of_study, phone)
VALUES
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', '2023CS0104', 'FEMALE', 'B.Tech Computer Science & Engineering', 3, '+91-9876543210'),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333332', '2024ME0087', 'MALE', 'B.Tech Mechanical Engineering', 2, '+91-9876543211'),
  ('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', '2025EE0042', 'MALE', 'B.Tech Electrical Engineering', 1, '+91-9876543212'),
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333334', '2022CV0015', 'FEMALE', 'B.Tech Civil Engineering', 4, '+91-9876543213'),
  ('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333335', '2023IS0056', 'MALE', 'B.Tech Information Science', 3, '+91-9876543214')
ON CONFLICT (student_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. HOSTELS
-- ---------------------------------------------------------------------
INSERT INTO hostels (hostel_id, hostel_code, name, gender_policy, address, latitude, longitude, description, status)
VALUES
  ('55555555-5555-5555-5555-555555555551', 'KV-BH1', 'Kaveri Boys Hostel', 'MALE', 'North Campus, Sector 4', 12.971600, 77.594600, 'Modern 4-story residence for male undergraduate engineering students with indoor badminton court and high-speed Wi-Fi.', 'ACTIVE'),
  ('55555555-5555-5555-5555-555555555552', 'GG-GH1', 'Ganga Girls Hostel', 'FEMALE', 'South Campus, Green Enclave', 12.972100, 77.595200, 'Secure gated residence for female students featuring 24x7 security, study hall, geysers, and reading lounge.', 'ACTIVE'),
  ('55555555-5555-5555-5555-555555555553', 'YM-INT', 'Yamuna International & Research Residence', 'MIXED', 'Central Campus, University Ring Road', 12.973000, 77.596000, 'Co-ed premium residence with independent wings for international scholars and postgraduate researchers.', 'ACTIVE')
ON CONFLICT (hostel_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. WARDENS
-- ---------------------------------------------------------------------
INSERT INTO wardens (warden_id, account_id, hostel_id, employee_code, phone, status)
VALUES
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', 'EMP-WRD-001', '+91-9448001122', 'ACTIVE'),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', 'EMP-WRD-002', '+91-9448001123', 'ACTIVE'),
  ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', 'EMP-WRD-003', '+91-9448001124', 'ACTIVE')
ON CONFLICT (warden_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. BLOCKS
-- ---------------------------------------------------------------------
INSERT INTO blocks (block_id, hostel_id, block_code, name, floors, status)
VALUES
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555551', 'BLK-A', 'Block A (Brahmaputra Wing)', 4, 'ACTIVE'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555551', 'BLK-B', 'Block B (Godavari Wing)', 3, 'ACTIVE'),
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555552', 'BLK-G1', 'Block G1 (Maitreyi Wing)', 4, 'ACTIVE'),
  ('77777777-7777-7777-7777-777777777774', '55555555-5555-5555-5555-555555555552', 'BLK-G2', 'Block G2 (Gargi Wing)', 3, 'ACTIVE'),
  ('77777777-7777-7777-7777-777777777775', '55555555-5555-5555-5555-555555555553', 'BLK-Y1', 'Block Y1 (Aryabhata Wing)', 4, 'ACTIVE')
ON CONFLICT (block_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. ROOM TYPES
-- ---------------------------------------------------------------------
INSERT INTO room_types (room_type_id, name, bed_count, has_attached_bathroom, is_ac, description)
VALUES
  ('88888888-8888-8888-8888-888888888881', 'Single AC Executive', 1, TRUE, TRUE, 'Private spacious single occupancy room with inverter split AC, private en-suite bathroom, and study balcony.'),
  ('88888888-8888-8888-8888-888888888882', 'Double Sharing Premium AC', 2, TRUE, TRUE, 'Comfortable twin occupancy with 1.5-ton AC, dedicated ergonomic desks, and attached modern bathroom.'),
  ('88888888-8888-8888-8888-888888888883', 'Double Sharing Standard', 2, FALSE, FALSE, 'Well-ventilated twin sharing room with shared floor washrooms and spacious wooden wardrobes.'),
  ('88888888-8888-8888-8888-888888888884', 'Triple Sharing Economical', 3, FALSE, FALSE, 'Budget-friendly triple sharing accommodation with individual study carrels and high ceiling fans.')
ON CONFLICT (room_type_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. AMENITIES & ROOM TYPE AMENITIES
-- ---------------------------------------------------------------------
INSERT INTO amenities (amenity_id, name, description)
VALUES
  ('99999999-9999-9999-9999-999999999991', 'High-Speed Wi-Fi', 'Campus 1 Gbps fiber Wi-Fi with roaming student SSID coverage.'),
  ('99999999-9999-9999-9999-999999999992', '24x7 Hot Water Geyser', 'Solar and electric water heating in bathrooms.'),
  ('99999999-9999-9999-9999-999999999993', 'Ergonomic Study Desk & Chair', 'Dedicated study desk with LED task light and mesh chair.'),
  ('99999999-9999-9999-9999-999999999994', 'Split Air Conditioner', 'Energy efficient 5-star inverter air conditioning.'),
  ('99999999-9999-9999-9999-999999999995', 'Attached Bathroom', 'Private en-suite bathroom with modern fittings.'),
  ('99999999-9999-9999-9999-999999999996', '100% DG Power Backup', 'Seamless backup power for lights, fans, and Wi-Fi routers.'),
  ('99999999-9999-9999-9999-999999999997', 'Balcony / Garden View', 'Private balcony with scenic university landscape views.')
ON CONFLICT (amenity_id) DO NOTHING;

-- Map Amenities to Room Types
INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES
  -- Single AC Executive (All amenities)
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999991'),
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999992'),
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999993'),
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999994'),
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999995'),
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999996'),
  ('88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999997'),
  -- Double Sharing Premium AC
  ('88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999991'),
  ('88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999992'),
  ('88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999993'),
  ('88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999994'),
  ('88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999995'),
  ('88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999996'),
  -- Double Sharing Standard
  ('88888888-8888-8888-8888-888888888883', '99999999-9999-9999-9999-999999999991'),
  ('88888888-8888-8888-8888-888888888883', '99999999-9999-9999-9999-999999999992'),
  ('88888888-8888-8888-8888-888888888883', '99999999-9999-9999-9999-999999999993'),
  ('88888888-8888-8888-8888-888888888883', '99999999-9999-9999-9999-999999999996'),
  -- Triple Sharing Economical
  ('88888888-8888-8888-8888-888888888884', '99999999-9999-9999-9999-999999999991'),
  ('88888888-8888-8888-8888-888888888884', '99999999-9999-9999-9999-999999999993'),
  ('88888888-8888-8888-8888-888888888884', '99999999-9999-9999-9999-999999999996')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. ACADEMIC TERMS
-- ---------------------------------------------------------------------
INSERT INTO academic_terms (term_id, name, start_date, end_date, applications_open_at, applications_close_at, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Autumn Semester 2026-27', (CURRENT_DATE + INTERVAL '30 days')::date, (CURRENT_DATE + INTERVAL '180 days')::date, now() - INTERVAL '7 days', now() + INTERVAL '60 days', 'OPEN'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Spring Semester 2027', (CURRENT_DATE + INTERVAL '190 days')::date, (CURRENT_DATE + INTERVAL '340 days')::date, now() + INTERVAL '65 days', now() + INTERVAL '180 days', 'UPCOMING')
ON CONFLICT (term_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. FEE SCHEDULES (INR)
-- ---------------------------------------------------------------------
INSERT INTO fee_schedules (fee_id, term_id, room_type_id, rent_amount, deposit_amount, currency, created_by)
VALUES
  -- Autumn Semester Fees
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888881', 65000.00, 10000.00, 'INR', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888882', 48000.00, 10000.00, 'INR', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888883', 35000.00, 8000.00, 'INR', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888884', 28000.00, 8000.00, 'INR', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (term_id, room_type_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. BED INVENTORY POOL
-- ---------------------------------------------------------------------
INSERT INTO bed_inventory (inventory_id, hostel_id, room_type_id, term_id, beds_total, beds_available, beds_held, beds_allocated, version)
VALUES
  -- Kaveri Boys Hostel: Single AC (4 physical beds: 3 avail, 0 held, 1 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', '55555555-5555-5555-5555-555555555551', '88888888-8888-8888-8888-888888888881', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 3, 0, 1, 1),
  -- Kaveri Boys Hostel: Double AC (4 physical beds: 3 avail, 1 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', '55555555-5555-5555-5555-555555555551', '88888888-8888-8888-8888-888888888882', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 3, 1, 0, 1),
  -- Kaveri Boys Hostel: Double Standard (4 physical beds: 4 avail, 0 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', '55555555-5555-5555-5555-555555555551', '88888888-8888-8888-8888-888888888883', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
  -- Ganga Girls Hostel: Double AC (4 physical beds: 4 avail, 0 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd4', '55555555-5555-5555-5555-555555555552', '88888888-8888-8888-8888-888888888882', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
  -- Ganga Girls Hostel: Single AC (4 physical beds: 3 avail, 0 held, 1 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd5', '55555555-5555-5555-5555-555555555552', '88888888-8888-8888-8888-888888888881', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 3, 0, 1, 1),
  -- Yamuna International: Single AC (4 physical beds: 4 avail, 0 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd6', '55555555-5555-5555-5555-555555555553', '88888888-8888-8888-8888-888888888881', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1)
ON CONFLICT (hostel_id, room_type_id, term_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 11. ROOMS & BEDS (exact physical match to bed_inventory.beds_total)
-- ---------------------------------------------------------------------
INSERT INTO rooms (room_id, block_id, room_type_id, room_number, floor, status)
VALUES
  -- Block A (Kaveri): 4 Single AC (A-101..A-104), 2 Double AC (A-105..A-106), 2 Double Standard (A-201..A-202)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'A-101', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'A-103', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee12', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'A-104', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee13', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'A-105', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888882', 'A-102', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee21', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888882', 'A-106', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888883', 'A-201', 2, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee31', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888883', 'A-202', 2, 'AVAILABLE'),
  -- Block G1 (Ganga): 4 Single AC, 2 Double AC
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888881', 'G-101', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee41', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888881', 'G-103', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee42', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888881', 'G-104', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee43', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888881', 'G-105', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888882', 'G-102', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee51', '77777777-7777-7777-7777-777777777773', '88888888-8888-8888-8888-888888888882', 'G-106', 1, 'AVAILABLE'),
  -- Block Y1 (Yamuna): 4 Single AC
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee6', '77777777-7777-7777-7777-777777777775', '88888888-8888-8888-8888-888888888881', 'Y-101', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee61', '77777777-7777-7777-7777-777777777775', '88888888-8888-8888-8888-888888888881', 'Y-102', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee62', '77777777-7777-7777-7777-777777777775', '88888888-8888-8888-8888-888888888881', 'Y-103', 1, 'AVAILABLE'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee63', '77777777-7777-7777-7777-777777777775', '88888888-8888-8888-8888-888888888881', 'Y-104', 1, 'AVAILABLE')
ON CONFLICT (block_id, room_number) DO NOTHING;

-- Beds for Rooms (24 physical beds matching 6 x 4 bed_inventory pools)
INSERT INTO beds (bed_id, room_id, bed_label, status)
VALUES
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff9', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff10', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee12', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff11', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee13', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'Bed-A', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff3', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'Bed-B', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff12', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee21', 'Bed-A', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff13', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee21', 'Bed-B', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff4', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'Bed-A', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff5', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'Bed-B', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff14', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee31', 'Bed-A', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff15', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee31', 'Bed-B', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff6', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff16', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee41', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff17', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee42', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff18', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee43', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff7', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', 'Bed-A', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff8', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', 'Bed-B', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff19', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee51', 'Bed-A', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff20', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee51', 'Bed-B', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff21', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee6', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff22', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee61', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff23', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee62', 'Bed-1', 'ACTIVE'),
  ('ffffffff-ffff-ffff-ffff-ffffffffff24', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee63', 'Bed-1', 'ACTIVE')
ON CONFLICT (room_id, bed_label) DO NOTHING;

-- ---------------------------------------------------------------------
-- 12. SAMPLE APPLICATIONS, ALLOCATIONS, DIGITAL PASSES & PAYMENTS
-- ---------------------------------------------------------------------

-- Application 1: Rohan Verma (Allocated)
INSERT INTO hostel_applications (application_id, student_id, term_id, inventory_id, status, applied_at, decided_at)
VALUES
  ('12121212-1212-1212-1212-121212121211', '44444444-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'ALLOCATED', now() - interval '5 days', now() - interval '5 days')
ON CONFLICT (application_id) DO NOTHING;

-- Allocation 1: Rohan Verma
INSERT INTO allocations (allocation_id, application_id, student_id, bed_id, start_date, end_date, status, allotment_pass_code, allocated_at)
VALUES
  ('13131313-1313-1313-1313-131313131311', '12121212-1212-1212-1212-121212121211', '44444444-4444-4444-4444-444444444442', 'ffffffff-ffff-ffff-ffff-fffffffffff1', '2026-08-01', '2026-12-20', 'CHECKED_IN', 'PASS-2026-KV-101A', now() - interval '5 days')
ON CONFLICT (allocation_id) DO NOTHING;

-- Check-in for Rohan Verma
INSERT INTO check_ins (check_in_id, allocation_id, warden_id, checked_in_at, room_condition, condition_notes, is_simulated)
VALUES
  ('14141414-1414-1414-1414-141414141411', '13131313-1313-1313-1313-131313131311', '66666666-6666-6666-6666-666666666661', now() - interval '4 days', 'GOOD', 'Keys handed over, inventory verified: 1 study table, 1 mattress, 1 AC remote.', TRUE)
ON CONFLICT (check_in_id) DO NOTHING;

-- Payment for Rohan Verma (Rent + Deposit)
INSERT INTO payment_records (payment_id, application_id, student_id, fee_type, amount, currency, status, transaction_reference, paid_at)
VALUES
  ('15151515-1515-1515-1515-151515151511', '12121212-1212-1212-1212-121212121211', '44444444-4444-4444-4444-444444444442', 'RENT', 65000.00, 'INR', 'SUCCESS', 'TXN-UPI-20260801-987654', now() - interval '5 days'),
  ('15151515-1515-1515-1515-151515151512', '12121212-1212-1212-1212-121212121211', '44444444-4444-4444-4444-444444444442', 'DEPOSIT', 10000.00, 'INR', 'SUCCESS', 'TXN-UPI-20260801-987655', now() - interval '5 days')
ON CONFLICT (payment_id) DO NOTHING;

-- Application 2: Ananya Sharma (Allocated in Ganga Girls Hostel)
INSERT INTO hostel_applications (application_id, student_id, term_id, inventory_id, status, applied_at, decided_at)
VALUES
  ('12121212-1212-1212-1212-121212121212', '44444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-ddddddddddd5', 'ALLOCATED', now() - interval '3 days', now() - interval '3 days')
ON CONFLICT (application_id) DO NOTHING;

-- Allocation 2: Ananya Sharma
INSERT INTO allocations (allocation_id, application_id, student_id, bed_id, start_date, end_date, status, allotment_pass_code, allocated_at)
VALUES
  ('13131313-1313-1313-1313-131313131312', '12121212-1212-1212-1212-121212121212', '44444444-4444-4444-4444-444444444441', 'ffffffff-ffff-ffff-ffff-fffffffffff6', '2026-08-01', '2026-12-20', 'ALLOCATED', 'PASS-2026-GG-101A', now() - interval '3 days')
ON CONFLICT (allocation_id) DO NOTHING;

-- Application 3: Arjun Patel (Held - 30 min window active)
INSERT INTO hostel_applications (application_id, student_id, term_id, inventory_id, status, hold_expires_at, applied_at)
VALUES
  ('12121212-1212-1212-1212-121212121213', '44444444-4444-4444-4444-444444444443', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-ddddddddddd2', 'HELD', now() + interval '25 minutes', now() - interval '5 minutes')
ON CONFLICT (application_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 13. MAINTENANCE TICKETS
-- ---------------------------------------------------------------------
INSERT INTO maintenance_tickets (ticket_id, room_id, raised_by_student_id, category, priority, title, description, status, assigned_to, created_at)
VALUES
  ('16161616-1616-1616-1616-161616161611', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '44444444-4444-4444-4444-444444444442', 'ELECTRICAL', 'HIGH', 'AC remote and thermostat error', 'The inverter AC in Room A-101 shows error code E4 and does not cool.', 'IN_PROGRESS', 'Manoj Sharma (Electrical Tech)', now() - interval '2 days'),
  ('16161616-1616-1616-1616-161616161612', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', '44444444-4444-4444-4444-444444444441', 'PLUMBING', 'URGENT', 'Bathroom tap dripping continuously', 'Water leak under washbasin faucet causing pooling.', 'OPEN', NULL, now() - interval '4 hours')
ON CONFLICT (ticket_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 14. ROOM SWAP REQUEST
-- ---------------------------------------------------------------------
INSERT INTO room_swap_requests (swap_id, allocation_id, reason, new_bed_id, status, created_at)
VALUES
  ('17171717-1717-1717-1717-171717171711', '13131313-1313-1313-1313-131313131311', 'Requesting shift to ground floor room due to ankle sports injury.', 'ffffffff-ffff-ffff-ffff-fffffffffff2', 'REQUESTED', now() - interval '1 day')
ON CONFLICT (swap_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 15. AUDIT LOGS
-- ---------------------------------------------------------------------
INSERT INTO audit_logs (audit_id, actor_account_id, actor_role, action, entity_type, entity_id, details, ip_address, created_at)
VALUES
  ('18181818-1818-1818-1818-181818181811', '11111111-1111-1111-1111-111111111111', 'HOUSING_ADMIN', 'CONFIGURE_FEE_SCHEDULE', 'fee_schedules', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"term": "Autumn 2026-27", "room_type": "Single AC Executive", "rent_inr": 65000, "deposit_inr": 10000}', '10.0.4.15', now() - interval '10 days'),
  ('18181818-1818-1818-1818-181818181812', '22222222-2222-2222-2222-222222222221', 'WARDEN', 'CHECK_IN_STUDENT', 'check_ins', '14141414-1414-1414-1414-141414141411', '{"student": "Rohan Verma", "room": "A-101", "condition": "GOOD"}', '10.0.4.88', now() - interval '4 days')
ON CONFLICT (audit_id) DO NOTHING;

COMMIT;
