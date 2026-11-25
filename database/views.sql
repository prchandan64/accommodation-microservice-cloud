-- =====================================================================
-- Accommodation Microservice Analytical & Reporting SQL Views
-- Database: campus_mobility_accommodation
-- =====================================================================

-- 1. Student Available Bed Search with INR Pricing
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

-- 2. Student Digital Room Allotment Pass
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

-- 3. Warden Expected Arrivals
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

-- 4. Warden Prioritized Maintenance Queue
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

-- 5. Housing Admin Occupancy Dashboard
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

-- 6. Revenue and Financial Ledger (INR)
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
