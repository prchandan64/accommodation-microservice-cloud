BEGIN;
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
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888881', 65000.00, 10000.00, 'INR', NULL),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888882', 48000.00, 10000.00, 'INR', NULL),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888883', 35000.00, 8000.00, 'INR', NULL),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888884', 28000.00, 8000.00, 'INR', NULL)
ON CONFLICT (term_id, room_type_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. BED INVENTORY POOL
-- ---------------------------------------------------------------------
INSERT INTO bed_inventory (inventory_id, hostel_id, room_type_id, term_id, beds_total, beds_available, beds_held, beds_allocated, version)
VALUES
  -- Kaveri Boys Hostel: Single AC (4 physical beds: 3 avail, 0 held, 1 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', '55555555-5555-5555-5555-555555555551', '88888888-8888-8888-8888-888888888881', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
  -- Kaveri Boys Hostel: Double AC (4 physical beds: 3 avail, 1 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', '55555555-5555-5555-5555-555555555551', '88888888-8888-8888-8888-888888888882', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
  -- Kaveri Boys Hostel: Double Standard (4 physical beds: 4 avail, 0 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', '55555555-5555-5555-5555-555555555551', '88888888-8888-8888-8888-888888888883', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
  -- Ganga Girls Hostel: Double AC (4 physical beds: 4 avail, 0 held, 0 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd4', '55555555-5555-5555-5555-555555555552', '88888888-8888-8888-8888-888888888882', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
  -- Ganga Girls Hostel: Single AC (4 physical beds: 3 avail, 0 held, 1 alloc)
  ('dddddddd-dddd-dddd-dddd-ddddddddddd5', '55555555-5555-5555-5555-555555555552', '88888888-8888-8888-8888-888888888881', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 4, 0, 0, 1),
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

COMMIT;
