// Type definitions for Accommodation Microservice
// Student Mobility & Lifestyle Platform

export type Role = 'STUDENT' | 'WARDEN' | 'HOUSING_ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type GenderPolicy = 'MALE' | 'FEMALE' | 'MIXED';
export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';
export type RoomStatus = 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'CLOSED';
export type BedStatus = 'ACTIVE' | 'OUT_OF_SERVICE';
export type ApplicationStatus = 'APPLIED' | 'HELD' | 'ALLOCATED' | 'REJECTED' | 'EXPIRED' | 'FAILED' | 'CANCELLED';
export type AllocationStatus = 'ALLOCATED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
export type RoomCondition = 'GOOD' | 'FAIR' | 'NEEDS_REPAIR';
export type SwapStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'FURNITURE' | 'CLEANING' | 'NETWORK' | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type FeeType = 'RENT' | 'DEPOSIT' | 'REFUND';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface UserAccount {
  account_id: string;
  email: string;
  role: Role;
  full_name: string;
  account_status: AccountStatus;
  student_profile?: StudentProfile;
  warden_profile?: WardenProfile;
}

export interface StudentProfile {
  student_id: string;
  enrollment_no: string;
  gender: StudentGender;
  course: string;
  year_of_study: number;
  phone: string;
}

export interface WardenProfile {
  warden_id: string;
  hostel_id: string;
  hostel_name?: string;
  employee_code: string;
  phone: string;
}

export interface Amenity {
  amenity_id: string;
  name: string;
  description: string;
}

export interface RoomType {
  room_type_id: string;
  name: string;
  bed_count: number;
  has_attached_bathroom: boolean;
  is_ac: boolean;
  description: string;
  amenities: Amenity[];
}

export interface Block {
  block_id: string;
  hostel_id: string;
  block_code: string;
  name: string;
  floors: number;
  status: string;
}

export interface Hostel {
  hostel_id: string;
  hostel_code: string;
  name: string;
  gender_policy: GenderPolicy;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  status: string;
  blocks?: Block[];
  image_url?: string;
}

export interface Bed {
  bed_id: string;
  room_id: string;
  bed_label: string;
  status: BedStatus;
  room_number?: string;
  block_code?: string;
}

export interface Room {
  room_id: string;
  block_id: string;
  room_type_id: string;
  room_number: string;
  floor: number;
  status: RoomStatus;
  room_type?: RoomType;
  beds?: Bed[];
}

export interface AcademicTerm {
  term_id: string;
  name: string;
  start_date: string;
  end_date: string;
  applications_open_at: string;
  applications_close_at: string;
  status: 'UPCOMING' | 'OPEN' | 'ONGOING' | 'COMPLETED';
}

export interface FeeSchedule {
  fee_id: string;
  term_id: string;
  room_type_id: string;
  rent_amount: number;
  deposit_amount: number;
  currency: string;
}

export interface BedInventory {
  inventory_id: string;
  hostel_id: string;
  hostel_name: string;
  room_type_id: string;
  room_type_name: string;
  term_id: string;
  term_name: string;
  beds_total: number;
  beds_available: number;
  beds_held: number;
  beds_allocated: number;
  rent_amount: number;
  deposit_amount: number;
  gender_policy: GenderPolicy;
  is_ac: boolean;
  has_attached_bathroom: boolean;
}

export interface HostelApplication {
  application_id: string;
  student_id: string;
  term_id: string;
  inventory_id: string;
  status: ApplicationStatus;
  hold_expires_at?: string;
  status_reason?: string;
  applied_at: string;
  decided_at?: string;
  inventory?: BedInventory;
  allocation?: Allocation;
  payments?: PaymentRecord[];
}

export interface Allocation {
  allocation_id: string;
  application_id: string;
  student_id: string;
  student_name: string;
  enrollment_no: string;
  bed_id: string;
  bed_label: string;
  room_number: string;
  block_code: string;
  hostel_name: string;
  start_date: string;
  end_date: string;
  status: AllocationStatus;
  allotment_pass_code: string;
  allocated_at: string;
  is_ac: boolean;
}

export interface CheckInRecord {
  check_in_id: string;
  allocation_id: string;
  student_name: string;
  room_number: string;
  bed_label: string;
  warden_name: string;
  checked_in_at: string;
  room_condition: RoomCondition;
  condition_notes: string;
}

export interface RoomSwapRequest {
  swap_id: string;
  allocation_id: string;
  student_name: string;
  current_room: string;
  current_bed: string;
  target_bed_id?: string;
  target_bed_label?: string;
  reason: string;
  status: SwapStatus;
  decision_note?: string;
  created_at: string;
}

export interface MaintenanceTicket {
  ticket_id: string;
  room_id: string;
  room_number: string;
  block_code: string;
  hostel_name: string;
  raised_by_student_name?: string;
  category: TicketCategory;
  priority: TicketPriority;
  title: string;
  description: string;
  status: TicketStatus;
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface PaymentRecord {
  payment_id: string;
  application_id: string;
  student_id: string;
  fee_type: FeeType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transaction_reference: string;
  paid_at?: string;
  created_at: string;
}

export interface AuditLog {
  audit_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}
