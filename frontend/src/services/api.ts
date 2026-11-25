// API Client for Accommodation Microservice
// Interacts with FastAPI backend (/api/v1/accommodation) and WebSocket (/api/v1/accommodation/ws/inventory)

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1/accommodation';

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  enrollment_no: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  course?: string;
  year_of_study?: number;
  phone?: string;
}

export interface CreateStaffPayload {
  email: string;
  full_name: string;
  role: 'WARDEN' | 'HOUSING_ADMIN';
  password: string;
  hostel_id?: string;
  employee_code?: string;
  phone?: string;
}

class ApiService {
  // In-memory JWT storage only (never persisted to localStorage)
  private token: string | null = null;
  private onUnauthorized?: () => void;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      let errorCode = 'API_ERROR';
      let details: Record<string, unknown> | undefined;
      const retryHeader = response.headers.get('Retry-After');
      let retryAfter = retryHeader ? Number(retryHeader) : undefined;

      try {
        const errorData = await response.json();
        if (errorData?.error) {
          if (errorData.error.message) errorMsg = errorData.error.message;
          if (errorData.error.code) errorCode = errorData.error.code;
          if (errorData.error.details) {
            details = errorData.error.details;
            if (!retryAfter && typeof details?.retry_after_seconds === 'number') {
              retryAfter = details.retry_after_seconds;
            }
          }
        }
      } catch {
        // use default error message
      }

      if (response.status === 401 && this.token && this.onUnauthorized) {
        this.onUnauthorized();
      }

      throw new ApiError(errorMsg, response.status, errorCode, retryAfter, details);
    }

    return response.json();
  }

  // --- Health Check ---
  async checkHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // --- Auth Endpoints ---
  async register(payload: RegisterPayload): Promise<{ account_id: string; student_id: string; email: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(email: string, password: string): Promise<{ challenge_id: string; message: string; expires_in: number }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyOtp(challenge_id: string, otp_code: string): Promise<{ access_token: string; token_type: string; expires_in: number; role: string }> {
    const data = await this.request<{ access_token: string; token_type: string; expires_in: number; role: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ challenge_id, otp_code }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async resendOtp(challenge_id: string): Promise<{ challenge_id: string; message: string; expires_in: number }> {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ challenge_id }),
    });
  }

  async getMe(): Promise<{
    account_id: string;
    email: string;
    full_name: string;
    role: 'STUDENT' | 'WARDEN' | 'HOUSING_ADMIN';
    student_id?: string | null;
    warden_id?: string | null;
    hostel_id?: string | null;
  }> {
    return this.request('/auth/me');
  }

  // --- Catalogue & Availability ---
  async getHostels(gender?: string): Promise<any[]> {
    const query = gender ? `?gender=${encodeURIComponent(gender)}` : '';
    return this.request(`/hostels${query}`);
  }

  async getRoomTypes(): Promise<any[]> {
    return this.request('/room-types');
  }

  async getTerms(status?: string): Promise<any[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/terms${query}`);
  }

  async getAvailability(termId?: string, hostelId?: string, roomTypeId?: string): Promise<{ items: any[] }> {
    const params = new URLSearchParams();
    if (termId) params.append('term_id', termId);
    if (hostelId) params.append('hostel_id', hostelId);
    if (roomTypeId) params.append('room_type_id', roomTypeId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/availability${query}`);
  }

  // --- Bed Booking Engine ---
  async applyAndHoldBed(inventory_id: string): Promise<any> {
    return this.request('/applications', {
      method: 'POST',
      body: JSON.stringify({ inventory_id }),
    });
  }

  async getApplication(applicationId: string): Promise<any> {
    return this.request(`/applications/${applicationId}`);
  }

  async payForApplication(applicationId: string, payment_token: 'tok_ok' | 'tok_fail' = 'tok_ok'): Promise<any> {
    return this.request(`/applications/${applicationId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ payment_token }),
    });
  }

  async cancelApplication(applicationId: string, reason?: string): Promise<any> {
    return this.request(`/applications/${applicationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Cancelled by student.' }),
    });
  }

  // --- Student Operations ---
  async getMyAllocations(): Promise<any[]> {
    return this.request('/allocations/me');
  }

  async getRoomPass(allocationId: string): Promise<any> {
    return this.request(`/allocations/${allocationId}/pass`);
  }

  async submitSwapRequest(reason: string, target_bed_label?: string): Promise<any> {
    return this.request('/swap-requests', {
      method: 'POST',
      body: JSON.stringify({ reason, target_bed_label }),
    });
  }

  async getMySwapRequests(): Promise<any[]> {
    return this.request('/swap-requests/me');
  }

  async submitTicket(category: string, priority: string, title: string, description?: string): Promise<any> {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify({ category, priority, title, description }),
    });
  }

  async getMyTickets(): Promise<any[]> {
    return this.request('/tickets/me');
  }

  // --- Warden Operations ---
  async getWardenAllocations(): Promise<any[]> {
    return this.request('/warden/allocations');
  }

  async wardenCheckIn(allocation_id: string, room_condition: string, condition_notes?: string): Promise<any> {
    return this.request('/warden/check-ins', {
      method: 'POST',
      body: JSON.stringify({ allocation_id, room_condition, condition_notes }),
    });
  }

  async getWardenSwapRequests(): Promise<any[]> {
    return this.request('/warden/swap-requests');
  }

  async approveSwapRequest(swapId: string, note?: string): Promise<any> {
    return this.request(`/warden/swap-requests/${swapId}/approve?decision_note=${encodeURIComponent(note || 'Approved by Warden.')}`, {
      method: 'POST',
    });
  }

  async rejectSwapRequest(swapId: string, note?: string): Promise<any> {
    return this.request(`/warden/swap-requests/${swapId}/reject?decision_note=${encodeURIComponent(note || 'Denied by Warden.')}`, {
      method: 'POST',
    });
  }

  async getWardenTickets(): Promise<any[]> {
    return this.request('/warden/tickets');
  }

  async updateTicket(ticketId: string, status: string, assigned_to?: string, resolution_notes?: string): Promise<any> {
    return this.request(`/warden/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assigned_to, resolution_notes }),
    });
  }

  // --- Admin Operations ---
  async getAdminOccupancy(): Promise<any[]> {
    return this.request('/admin/occupancy');
  }

  async getAdminForecast(): Promise<any[]> {
    return this.request('/admin/forecast');
  }

  async createStaffAccount(payload: CreateStaffPayload): Promise<{ account_id: string; warden_id?: string; role: string; email: string }> {
    return this.request('/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async setAccountStatus(accountId: string, account_status: 'ACTIVE' | 'SUSPENDED'): Promise<{ account_id: string; account_status: string }> {
    return this.request(`/admin/accounts/${accountId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ account_status }),
    });
  }
}

export const api = new ApiService();
