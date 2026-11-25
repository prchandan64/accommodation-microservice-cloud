import {
  UserAccount,
  Hostel,
  AcademicTerm,
  BedInventory,
  HostelApplication,
  Allocation,
  CheckInRecord,
  RoomSwapRequest,
  MaintenanceTicket,
  AuditLog
} from '../types';

export const MOCK_USERS: UserAccount[] = [
  {
    account_id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@example.test',
    role: 'HOUSING_ADMIN',
    full_name: 'Prof. Arvind Deshmukh',
    account_status: 'ACTIVE'
  },
  {
    account_id: '22222222-2222-2222-2222-222222222221',
    email: 'warden1@example.test',
    role: 'WARDEN',
    full_name: 'Dr. Suresh Kumar',
    account_status: 'ACTIVE',
    warden_profile: {
      warden_id: '66666666-6666-6666-6666-666666666661',
      hostel_id: '55555555-5555-5555-5555-555555555551',
      hostel_name: 'Kaveri Boys Hostel',
      employee_code: 'EMP-WRD-001',
      phone: '+91-9448001122'
    }
  },
  {
    account_id: '22222222-2222-2222-2222-222222222222',
    email: 'warden2@example.test',
    role: 'WARDEN',
    full_name: 'Prof. Sunita Reddy',
    account_status: 'ACTIVE',
    warden_profile: {
      warden_id: '66666666-6666-6666-6666-666666666662',
      hostel_id: '55555555-5555-5555-5555-555555555552',
      hostel_name: 'Ganga Girls Hostel',
      employee_code: 'EMP-WRD-002',
      phone: '+91-9448001123'
    }
  },
  {
    account_id: '33333333-3333-3333-3333-333333333331',
    email: 'student1@example.test',
    role: 'STUDENT',
    full_name: 'Ananya Sharma',
    account_status: 'ACTIVE',
    student_profile: {
      student_id: '44444444-4444-4444-4444-444444444441',
      enrollment_no: '2023CS0104',
      gender: 'FEMALE',
      course: 'B.Tech Computer Science',
      year_of_study: 3,
      phone: '+91-9876543210'
    }
  },
  {
    account_id: '33333333-3333-3333-3333-333333333332',
    email: 'student2@example.test',
    role: 'STUDENT',
    full_name: 'Rohan Verma',
    account_status: 'ACTIVE',
    student_profile: {
      student_id: '44444444-4444-4444-4444-444444444442',
      enrollment_no: '2024ME0087',
      gender: 'MALE',
      course: 'B.Tech Mechanical Engineering',
      year_of_study: 2,
      phone: '+91-9876543211'
    }
  },
  {
    account_id: '33333333-3333-3333-3333-333333333335',
    email: 'student5@example.test',
    role: 'STUDENT',
    full_name: 'Nikhil Hegde',
    account_status: 'ACTIVE',
    student_profile: {
      student_id: '44444444-4444-4444-4444-444444444445',
      enrollment_no: '2023IS0056',
      gender: 'MALE',
      course: 'B.Tech Information Science',
      year_of_study: 3,
      phone: '+91-9876543214'
    }
  }
];

export const MOCK_HOSTELS: Hostel[] = [
  {
    hostel_id: '55555555-5555-5555-5555-555555555551',
    hostel_code: 'KV-BH1',
    name: 'Kaveri Boys Hostel',
    gender_policy: 'MALE',
    address: 'North Campus, Tech Enclave Sector 4',
    latitude: 12.9716,
    longitude: 77.5946,
    description: 'Premier male undergraduate engineering hostel. Features 4 residential wings, high-speed campus Wi-Fi, indoor badminton court, night canteen, and 24x7 study lounges.',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800',
    blocks: [
      { block_id: 'b1', hostel_id: '55555555-5555-5555-5555-555555555551', block_code: 'BLK-A', name: 'Brahmaputra Wing', floors: 4, status: 'ACTIVE' },
      { block_id: 'b2', hostel_id: '55555555-5555-5555-5555-555555555551', block_code: 'BLK-B', name: 'Godavari Wing', floors: 3, status: 'ACTIVE' }
    ]
  },
  {
    hostel_id: '55555555-5555-5555-5555-555555555552',
    hostel_code: 'GG-GH1',
    name: 'Ganga Girls Hostel',
    gender_policy: 'FEMALE',
    address: 'South Campus, Green Orchard Sector',
    latitude: 12.9721,
    longitude: 77.5952,
    description: 'Secure, tranquil gated residence for female scholars with biometrics, in-house gymnasium, organic cafeteria, landscaped study gardens, and 24x7 nurse on duty.',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
    blocks: [
      { block_id: 'b3', hostel_id: '55555555-5555-5555-5555-555555555552', block_code: 'BLK-G1', name: 'Maitreyi Wing', floors: 4, status: 'ACTIVE' },
      { block_id: 'b4', hostel_id: '55555555-5555-5555-5555-555555555552', block_code: 'BLK-G2', name: 'Gargi Wing', floors: 3, status: 'ACTIVE' }
    ]
  },
  {
    hostel_id: '55555555-5555-5555-5555-555555555553',
    hostel_code: 'YM-INT',
    name: 'Yamuna International Residence',
    gender_policy: 'MIXED',
    address: 'Central Campus, University Ring Road',
    latitude: 12.973,
    longitude: 77.596,
    description: 'Co-ed premium residence with independent secure elevator wings for international exchange scholars, PhD candidates, and postgraduates.',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
    blocks: [
      { block_id: 'b5', hostel_id: '55555555-5555-5555-5555-555555555553', block_code: 'BLK-Y1', name: 'Aryabhata Wing', floors: 5, status: 'ACTIVE' }
    ]
  }
];

export const MOCK_TERMS: AcademicTerm[] = [
  {
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Autumn Semester 2026-27',
    start_date: '2026-08-01',
    end_date: '2026-12-20',
    applications_open_at: '2026-06-01T00:00:00Z',
    applications_close_at: '2026-08-15T23:59:59Z',
    status: 'OPEN'
  },
  {
    term_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Spring Semester 2027',
    start_date: '2027-01-05',
    end_date: '2027-05-30',
    applications_open_at: '2026-11-15T00:00:00Z',
    applications_close_at: '2027-01-20T23:59:59Z',
    status: 'UPCOMING'
  }
];

export const MOCK_INVENTORIES: BedInventory[] = [
  {
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    hostel_id: '55555555-5555-5555-5555-555555555551',
    hostel_name: 'Kaveri Boys Hostel',
    room_type_id: '88888888-8888-8888-8888-888888888881',
    room_type_name: 'Single AC Executive',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    term_name: 'Autumn Semester 2026-27',
    beds_total: 15,
    beds_available: 11,
    beds_held: 2,
    beds_allocated: 2,
    rent_amount: 65000,
    deposit_amount: 10000,
    gender_policy: 'MALE',
    is_ac: true,
    has_attached_bathroom: true
  },
  {
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    hostel_id: '55555555-5555-5555-5555-555555555551',
    hostel_name: 'Kaveri Boys Hostel',
    room_type_id: '88888888-8888-8888-8888-888888888882',
    room_type_name: 'Double Sharing Premium AC',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    term_name: 'Autumn Semester 2026-27',
    beds_total: 30,
    beds_available: 24,
    beds_held: 3,
    beds_allocated: 3,
    rent_amount: 48000,
    deposit_amount: 10000,
    gender_policy: 'MALE',
    is_ac: true,
    has_attached_bathroom: true
  },
  {
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd3',
    hostel_id: '55555555-5555-5555-5555-555555555551',
    hostel_name: 'Kaveri Boys Hostel',
    room_type_id: '88888888-8888-8888-8888-888888888883',
    room_type_name: 'Double Sharing Standard',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    term_name: 'Autumn Semester 2026-27',
    beds_total: 40,
    beds_available: 36,
    beds_held: 2,
    beds_allocated: 2,
    rent_amount: 35000,
    deposit_amount: 8000,
    gender_policy: 'MALE',
    is_ac: false,
    has_attached_bathroom: false
  },
  {
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    hostel_id: '55555555-5555-5555-5555-555555555552',
    hostel_name: 'Ganga Girls Hostel',
    room_type_id: '88888888-8888-8888-8888-888888888881',
    room_type_name: 'Single AC Executive',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    term_name: 'Autumn Semester 2026-27',
    beds_total: 12,
    beds_available: 8,
    beds_held: 2,
    beds_allocated: 2,
    rent_amount: 65000,
    deposit_amount: 10000,
    gender_policy: 'FEMALE',
    is_ac: true,
    has_attached_bathroom: true
  },
  {
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd5',
    hostel_id: '55555555-5555-5555-5555-555555555552',
    hostel_name: 'Ganga Girls Hostel',
    room_type_id: '88888888-8888-8888-8888-888888888882',
    room_type_name: 'Double Sharing Premium AC',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    term_name: 'Autumn Semester 2026-27',
    beds_total: 28,
    beds_available: 22,
    beds_held: 3,
    beds_allocated: 3,
    rent_amount: 48000,
    deposit_amount: 10000,
    gender_policy: 'FEMALE',
    is_ac: true,
    has_attached_bathroom: true
  },
  {
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd6',
    hostel_id: '55555555-5555-5555-5555-555555555553',
    hostel_name: 'Yamuna International Residence',
    room_type_id: '88888888-8888-8888-8888-888888888881',
    room_type_name: 'Single AC Executive',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    term_name: 'Autumn Semester 2026-27',
    beds_total: 20,
    beds_available: 17,
    beds_held: 1,
    beds_allocated: 2,
    rent_amount: 72000,
    deposit_amount: 12000,
    gender_policy: 'MIXED',
    is_ac: true,
    has_attached_bathroom: true
  }
];

export const MOCK_ALLOCATIONS: Allocation[] = [
  {
    allocation_id: '13131313-1313-1313-1313-131313131311',
    application_id: '12121212-1212-1212-1212-121212121211',
    student_id: '44444444-4444-4444-4444-444444444442',
    student_name: 'Rohan Verma',
    enrollment_no: '2024ME0087',
    bed_id: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
    bed_label: 'Bed-1',
    room_number: 'A-101',
    block_code: 'BLK-A',
    hostel_name: 'Kaveri Boys Hostel',
    start_date: '2026-08-01',
    end_date: '2026-12-20',
    status: 'CHECKED_IN',
    allotment_pass_code: 'PASS-2026-KV-101A',
    allocated_at: '2026-07-28T10:30:00Z',
    is_ac: true
  },
  {
    allocation_id: '13131313-1313-1313-1313-131313131312',
    application_id: '12121212-1212-1212-1212-121212121212',
    student_id: '44444444-4444-4444-4444-444444444441',
    student_name: 'Ananya Sharma',
    enrollment_no: '2023CS0104',
    bed_id: 'ffffffff-ffff-ffff-ffff-fffffffffff6',
    bed_label: 'Bed-A',
    room_number: 'G-101',
    block_code: 'BLK-G1',
    hostel_name: 'Ganga Girls Hostel',
    start_date: '2026-08-01',
    end_date: '2026-12-20',
    status: 'ALLOCATED',
    allotment_pass_code: 'PASS-2026-GG-101A',
    allocated_at: '2026-07-29T14:15:00Z',
    is_ac: true
  }
];

export const MOCK_APPLICATIONS: HostelApplication[] = [
  {
    application_id: '12121212-1212-1212-1212-121212121211',
    student_id: '44444444-4444-4444-4444-444444444442',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    status: 'ALLOCATED',
    applied_at: '2026-07-28T10:00:00Z',
    decided_at: '2026-07-28T10:15:00Z',
    inventory: MOCK_INVENTORIES[0],
    allocation: MOCK_ALLOCATIONS[0]
  },
  {
    application_id: '12121212-1212-1212-1212-121212121212',
    student_id: '44444444-4444-4444-4444-444444444441',
    term_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    inventory_id: 'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    status: 'ALLOCATED',
    applied_at: '2026-07-29T14:00:00Z',
    decided_at: '2026-07-29T14:10:00Z',
    inventory: MOCK_INVENTORIES[3],
    allocation: MOCK_ALLOCATIONS[1]
  }
];

export const MOCK_CHECKINS: CheckInRecord[] = [
  {
    check_in_id: '14141414-1414-1414-1414-141414141411',
    allocation_id: '13131313-1313-1313-1313-131313131311',
    student_name: 'Rohan Verma',
    room_number: 'A-101',
    bed_label: 'Bed-1',
    warden_name: 'Dr. Suresh Kumar',
    checked_in_at: '2026-08-01T11:00:00Z',
    room_condition: 'GOOD',
    condition_notes: 'Keys issued. Room inventory verified: 1 study desk, 1 mesh chair, 1 wardrobe, 1 AC remote. Clean and ready.'
  }
];

export const MOCK_SWAP_REQUESTS: RoomSwapRequest[] = [
  {
    swap_id: '17171717-1717-1717-1717-171717171711',
    allocation_id: '13131313-1313-1313-1313-131313131311',
    student_name: 'Rohan Verma',
    current_room: 'A-101',
    current_bed: 'Bed-1',
    target_bed_label: 'Room A-102 Bed-B (Ground Floor)',
    reason: 'Requesting shift to ground floor room due to left ankle sports fracture requiring crutches.',
    status: 'REQUESTED',
    created_at: '2026-08-03T15:20:00Z'
  }
];

export const MOCK_TICKETS: MaintenanceTicket[] = [
  {
    ticket_id: '16161616-1616-1616-1616-161616161611',
    room_id: 'r1',
    room_number: 'A-101',
    block_code: 'BLK-A',
    hostel_name: 'Kaveri Boys Hostel',
    raised_by_student_name: 'Rohan Verma',
    category: 'ELECTRICAL',
    priority: 'HIGH',
    title: 'AC Inverter cooling error (Error E4)',
    description: 'Split AC starts for 2 minutes then flashes error code E4 on LED and trips breaker.',
    status: 'IN_PROGRESS',
    assigned_to: 'Manoj Sharma (Electrical Tech)',
    created_at: '2026-08-04T09:30:00Z'
  },
  {
    ticket_id: '16161616-1616-1616-1616-161616161612',
    room_id: 'r4',
    room_number: 'G-101',
    block_code: 'BLK-G1',
    hostel_name: 'Ganga Girls Hostel',
    raised_by_student_name: 'Ananya Sharma',
    category: 'PLUMBING',
    priority: 'URGENT',
    title: 'Bathroom washbasin mixer tap leakage',
    description: 'Fresh water dripping continuously beneath washbasin cabinet, water pooling on floor.',
    status: 'OPEN',
    created_at: '2026-08-05T14:10:00Z'
  },
  {
    ticket_id: '16161616-1616-1616-1616-161616161613',
    room_id: 'r2',
    room_number: 'A-102',
    block_code: 'BLK-A',
    hostel_name: 'Kaveri Boys Hostel',
    category: 'NETWORK',
    priority: 'MEDIUM',
    title: 'Wi-Fi Access Point 5GHz intermittent packet drop',
    description: 'Wi-Fi SSID EduRoaming drops connection every 15 minutes during evening peak hours.',
    status: 'OPEN',
    created_at: '2026-08-05T18:00:00Z'
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    audit_id: 'aud-1',
    actor_name: 'Prof. Arvind Deshmukh',
    actor_role: 'HOUSING_ADMIN',
    action: 'CONFIGURE_FEE_SCHEDULE',
    entity_type: 'fee_schedules',
    entity_id: 'fee-1',
    details: { term: 'Autumn 2026-27', room_type: 'Single AC', rent_inr: 65000, deposit_inr: 10000 },
    ip_address: '10.0.4.15',
    created_at: '2026-07-20T10:00:00Z'
  },
  {
    audit_id: 'aud-2',
    actor_name: 'Dr. Suresh Kumar',
    actor_role: 'WARDEN',
    action: 'INSPECT_AND_CHECK_IN',
    entity_type: 'check_ins',
    entity_id: 'chk-1',
    details: { student: 'Rohan Verma', room: 'A-101', condition: 'GOOD' },
    ip_address: '10.0.4.88',
    created_at: '2026-08-01T11:00:00Z'
  },
  {
    audit_id: 'aud-3',
    actor_name: 'System Engine',
    actor_role: 'SYSTEM',
    action: 'ALLOCATE_BED_ATOMIC',
    entity_type: 'allocations',
    entity_id: 'alloc-1',
    details: { pass: 'PASS-2026-KV-101A', row_lock: 'FOR UPDATE SKIP LOCKED' },
    ip_address: '127.0.0.1',
    created_at: '2026-07-28T10:15:00Z'
  }
];
