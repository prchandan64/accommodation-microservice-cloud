import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  UserAccount,
  Hostel,
  AcademicTerm,
  BedInventory,
  HostelApplication,
  Allocation,
  RoomSwapRequest,
  MaintenanceTicket,
  RoomCondition
} from '../types';
import { MOCK_HOSTELS } from '../data/mockData';
import { api, ApiError, CreateStaffPayload } from '../services/api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AdminOccupancyRow {
  hostel_id: string;
  name: string;
  gender_policy: string;
  total_capacity: number;
  available_beds: number;
  held_beds: number;
  allocated_beds: number;
  occupancy_pct: number | null;
}

export interface ForecastRow {
  period: string;
  intake: string;
  actual: number | null;
  predicted: number;
  surge_probability: string;
}

interface AppContextType {
  currentUser: UserAccount | null;
  isBackendLive: boolean;
  isLoadingData: boolean;
  wsConnected: boolean;
  hostels: Hostel[];
  terms: AcademicTerm[];
  inventories: BedInventory[];
  applications: HostelApplication[];
  allocations: Allocation[];
  swapRequests: RoomSwapRequest[];
  tickets: MaintenanceTicket[];
  adminOccupancy: AdminOccupancyRow[];
  adminForecast: ForecastRow[];
  activeHoldTimer: number | null;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  completeLoginFromToken: () => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
  applyAndHoldBed: (inventoryId: string) => Promise<boolean>;
  payForApplication: (applicationId: string, paymentToken: 'tok_ok' | 'tok_fail') => Promise<boolean>;
  cancelApplication: (applicationId: string) => Promise<boolean>;
  requestRoomSwap: (reason: string, targetBedLabel: string) => Promise<boolean>;
  submitMaintenanceTicket: (category: string, priority: string, title: string, description: string) => Promise<boolean>;
  checkInStudent: (allocationId: string, condition: RoomCondition, notes: string) => Promise<boolean>;
  approveSwapRequest: (swapId: string, note?: string) => Promise<boolean>;
  rejectSwapRequest: (swapId: string, note?: string) => Promise<boolean>;
  updateTicketStatus: (ticketId: string, status: string, resolutionNotes?: string) => Promise<boolean>;
  createStaffAccount: (payload: CreateStaffPayload) => Promise<{ account_id: string; warden_id?: string; role: string; email: string } | null>;
  setStaffAccountStatus: (accountId: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [inventories, setInventories] = useState<BedInventory[]>([]);
  const [applications, setApplications] = useState<HostelApplication[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [swapRequests, setSwapRequests] = useState<RoomSwapRequest[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [adminOccupancy, setAdminOccupancy] = useState<AdminOccupancyRow[]>([]);
  const [adminForecast, setAdminForecast] = useState<ForecastRow[]>([]);

  const [activeHoldTimer, setActiveHoldTimer] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeqRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    toastSeqRef.current += 1;
    const id = `toast-${toastSeqRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const clearUserState = useCallback(() => {
    api.setToken(null);
    setCurrentUser(null);
    setInventories([]);
    setApplications([]);
    setAllocations([]);
    setSwapRequests([]);
    setTickets([]);
    setAdminOccupancy([]);
    setAdminForecast([]);
    setActiveHoldTimer(null);
  }, []);

  const logout = useCallback(() => {
    clearUserState();
    showToast('Signed out securely.', 'info');
  }, [clearUserState, showToast]);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      clearUserState();
      showToast('Your session has expired or is invalid. Please sign in again.', 'error');
    });
  }, [clearUserState, showToast]);

  const loadPublicCatalogue = useCallback(async () => {
    try {
      const [hRes, tRes] = await Promise.all([api.getHostels(), api.getTerms()]);
      const imageByCode = new Map(MOCK_HOSTELS.map((m) => [m.hostel_code, m.image_url]));
      const mappedHostels: Hostel[] = hRes.map((h: any) => ({
        ...h,
        address: h.address || '',
        description: h.description || '',
        latitude: h.latitude ?? 0,
        longitude: h.longitude ?? 0,
        image_url: imageByCode.get(h.hostel_code) || MOCK_HOSTELS[0]?.image_url,
      }));
      setHostels(mappedHostels);
      setTerms(tRes);
      return mappedHostels;
    } catch {
      return [];
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const loadedHostels = await loadPublicCatalogue();
      if (!currentUser) return;

      const hostelGenderMap = new Map(loadedHostels.map((h) => [h.hostel_id, h.gender_policy]));

      if (currentUser.role === 'STUDENT') {
        const [availRes, allocRes, swapRes, tktRes] = await Promise.all([
          api.getAvailability(),
          api.getMyAllocations(),
          api.getMySwapRequests(),
          api.getMyTickets(),
        ]);
        const items: BedInventory[] = (availRes.items || []).map((item: any) => ({
          ...item,
          term_name: item.term_name || 'Active Term',
          beds_total: Number(item.beds_available ?? 0),
          beds_available: Number(item.beds_available ?? 0),
          beds_held: 0,
          beds_allocated: 0,
          rent_amount: Number(item.rent_amount ?? 0),
          deposit_amount: Number(item.deposit_amount ?? 0),
          gender_policy: hostelGenderMap.get(item.hostel_id) || 'MIXED',
        }));
        setInventories(items);
        setAllocations(allocRes);
        setSwapRequests(
          swapRes.map((s: any) => ({
            ...s,
            current_room: s.room_number || '',
            current_bed: s.bed_label || '',
          }))
        );
        setTickets(tktRes);
      } else if (currentUser.role === 'WARDEN') {
        const [allocRes, swapRes, tktRes] = await Promise.all([
          api.getWardenAllocations(),
          api.getWardenSwapRequests(),
          api.getWardenTickets(),
        ]);
        setAllocations(allocRes);
        setSwapRequests(
          swapRes.map((s: any) => ({
            ...s,
            current_room: s.room_number || '',
            current_bed: s.bed_label || '',
          }))
        );
        setTickets(tktRes);
      } else if (currentUser.role === 'HOUSING_ADMIN') {
        const [occRes, fcRes, allocRes, tktRes] = await Promise.all([
          api.getAdminOccupancy(),
          api.getAdminForecast(),
          api.getWardenAllocations(),
          api.getWardenTickets(),
        ]);
        setAdminOccupancy(occRes);
        setAdminForecast(fcRes);
        setAllocations(allocRes);
        setTickets(tktRes);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        showToast(err.message, 'error');
      } else if (err instanceof Error) {
        showToast(err.message, 'error');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, loadPublicCatalogue, showToast]);

  // Initial health check & public catalogue load
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.checkHealth();
        if (res && res.status === 'healthy') {
          setIsBackendLive(true);
          await loadPublicCatalogue();
        }
      } catch {
        setIsBackendLive(false);
      }
    };
    init();
  }, [loadPublicCatalogue]);

  // Load role-specific data whenever authenticated user changes
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser, refreshData]);

  // WebSocket live inventory notifications when authenticated
  useEffect(() => {
    if (!currentUser || !isBackendLive) {
      setWsConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let closedByUnmount = false;
    let attempts = 0;

    const connect = () => {
      if (closedByUnmount || attempts >= 5) return;
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const configuredWs = import.meta.env.VITE_WS_URL;
      const wsUrl = configuredWs || `${wsProto}//${window.location.host}/api/v1/accommodation/ws/inventory`;

      try {
        ws = new WebSocket(wsUrl);
      } catch {
        return;
      }

      ws.onopen = () => {
        attempts = 0;
        setWsConnected(true);
        ws?.send('subscribe');
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (pingTimer) clearInterval(pingTimer);
        if (!closedByUnmount && attempts < 5) {
          attempts += 1;
          reconnectTimer = setTimeout(connect, Math.min(30000, 2000 * attempts));
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      setWsConnected(false);
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [currentUser, isBackendLive]);

  // Active hold countdown timer
  useEffect(() => {
    if (activeHoldTimer === null || activeHoldTimer <= 0) return;
    const interval = setInterval(() => {
      setActiveHoldTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setApplications((apps) =>
            apps.map((a) => (a.status === 'HELD' ? { ...a, status: 'EXPIRED', status_reason: 'Hold window expired.' } : a))
          );
          showToast('Bed hold window expired. Refreshing availability.', 'error');
          refreshData();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeHoldTimer, refreshData, showToast]);

  const completeLoginFromToken = async () => {
    const me = await api.getMe();
    const mapped: UserAccount = {
      account_id: me.account_id,
      email: me.email,
      full_name: me.full_name,
      role: me.role,
      account_status: 'ACTIVE',
      student_profile: me.student_id
        ? {
            student_id: me.student_id,
            enrollment_no: '',
            gender: 'MALE',
            course: '',
            year_of_study: 1,
            phone: '',
          }
        : undefined,
      warden_profile: me.warden_id
        ? {
            warden_id: me.warden_id,
            hostel_id: me.hostel_id || '',
            employee_code: '',
            phone: '',
          }
        : undefined,
    };
    setCurrentUser(mapped);
    setIsBackendLive(true);
  };

  const handleApiError = (err: unknown, fallbackMsg: string): false => {
    if (err instanceof ApiError) {
      showToast(err.message, 'error');
    } else if (err instanceof Error) {
      showToast(err.message, 'error');
    } else {
      showToast(fallbackMsg, 'error');
    }
    return false;
  };

  const applyAndHoldBed = async (inventoryId: string): Promise<boolean> => {
    try {
      const res = await api.applyAndHoldBed(inventoryId);
      const inv = inventories.find((i) => i.inventory_id === inventoryId);
      const heldApp: HostelApplication = {
        application_id: res.application_id,
        student_id: currentUser?.student_profile?.student_id || '',
        term_id: inv?.term_id || '',
        inventory_id: inventoryId,
        status: res.status,
        hold_expires_at: res.hold_expires_at,
        applied_at: new Date().toISOString(),
        inventory: inv
          ? {
              ...inv,
              rent_amount: Number(res.amount_due?.rent ?? inv.rent_amount),
              deposit_amount: Number(res.amount_due?.deposit ?? inv.deposit_amount),
            }
          : undefined,
      };
      setApplications((prev) => [heldApp, ...prev.filter((a) => a.application_id !== res.application_id)]);
      const expiresMs = new Date(res.hold_expires_at).getTime() - Date.now();
      setActiveHoldTimer(Math.max(60, Math.floor(expiresMs / 1000)));
      showToast('Bed held! Complete simulated payment before the timer expires.', 'success');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Unable to hold bed.');
    }
  };

  const payForApplication = async (applicationId: string, paymentToken: 'tok_ok' | 'tok_fail'): Promise<boolean> => {
    try {
      const res = await api.payForApplication(applicationId, paymentToken);
      setApplications((prev) =>
        prev.map((a) => (a.application_id === applicationId ? { ...a, status: res.status } : a))
      );
      setActiveHoldTimer(null);
      showToast(`Bed allocated! Pass Code: ${res.allocation.allotment_pass_code}`, 'success');
      await refreshData();
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'PAYMENT_FAILED' || err.code === 'HOLD_EXPIRED')) {
        setApplications((prev) =>
          prev.map((a) =>
            a.application_id === applicationId
              ? { ...a, status: err.code === 'HOLD_EXPIRED' ? 'EXPIRED' : 'FAILED' }
              : a
          )
        );
        setActiveHoldTimer(null);
      }
      await refreshData();
      return handleApiError(err, 'Payment failed.');
    }
  };

  const cancelApplication = async (applicationId: string): Promise<boolean> => {
    try {
      const res = await api.cancelApplication(applicationId);
      setApplications((prev) =>
        prev.map((a) => (a.application_id === applicationId ? { ...a, status: res.status } : a))
      );
      setActiveHoldTimer(null);
      showToast(
        res.refund_initiated ? 'Application cancelled and refund initiated.' : 'Hold cancelled and bed released.',
        'info'
      );
      await refreshData();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setApplications((prev) => prev.filter((a) => a.application_id !== applicationId));
        setActiveHoldTimer(null);
      }
      return handleApiError(err, 'Could not cancel application.');
    }
  };

  const requestRoomSwap = async (reason: string, targetBedLabel: string): Promise<boolean> => {
    try {
      await api.submitSwapRequest(reason, targetBedLabel);
      showToast('Room swap request submitted to Warden.', 'success');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Could not submit swap request.');
    }
  };

  const submitMaintenanceTicket = async (
    category: string,
    priority: string,
    title: string,
    description: string
  ): Promise<boolean> => {
    try {
      await api.submitTicket(category, priority, title, description);
      showToast('Maintenance ticket created.', 'success');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Could not create maintenance ticket.');
    }
  };

  const checkInStudent = async (allocationId: string, condition: RoomCondition, notes: string): Promise<boolean> => {
    try {
      await api.wardenCheckIn(allocationId, condition, notes);
      showToast('Student checked in successfully.', 'success');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Check-in failed.');
    }
  };

  const approveSwapRequest = async (swapId: string, note?: string): Promise<boolean> => {
    try {
      await api.approveSwapRequest(swapId, note);
      showToast('Room swap request approved.', 'success');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Could not approve swap request.');
    }
  };

  const rejectSwapRequest = async (swapId: string, note?: string): Promise<boolean> => {
    try {
      await api.rejectSwapRequest(swapId, note);
      showToast('Room swap request rejected.', 'info');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Could not reject swap request.');
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string, resolutionNotes?: string): Promise<boolean> => {
    try {
      await api.updateTicket(ticketId, status, undefined, resolutionNotes);
      showToast(`Ticket updated to ${status}.`, 'success');
      await refreshData();
      return true;
    } catch (err) {
      return handleApiError(err, 'Could not update ticket.');
    }
  };

  const createStaffAccount = async (payload: CreateStaffPayload) => {
    try {
      const created = await api.createStaffAccount(payload);
      showToast(`Created ${created.role} account for ${created.email}.`, 'success');
      return created;
    } catch (err) {
      handleApiError(err, 'Could not create staff account.');
      return null;
    }
  };

  const setStaffAccountStatus = async (accountId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<boolean> => {
    try {
      await api.setAccountStatus(accountId, status);
      showToast(`Account status updated to ${status}.`, 'success');
      return true;
    } catch (err) {
      return handleApiError(err, 'Could not update account status.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isBackendLive,
        isLoadingData,
        wsConnected,
        hostels,
        terms,
        inventories,
        applications,
        allocations,
        swapRequests,
        tickets,
        adminOccupancy,
        adminForecast,
        activeHoldTimer,
        toasts,
        showToast,
        removeToast,
        completeLoginFromToken,
        logout,
        refreshData,
        applyAndHoldBed,
        payForApplication,
        cancelApplication,
        requestRoomSwap,
        submitMaintenanceTicket,
        checkInStudent,
        approveSwapRequest,
        rejectSwapRequest,
        updateTicketStatus,
        createStaffAccount,
        setStaffAccountStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
