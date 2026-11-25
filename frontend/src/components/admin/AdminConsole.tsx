import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  Cpu,
  Building2,
  Users,
  RefreshCw,
  UserPlus,
  ShieldAlert
} from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const {
    currentUser,
    hostels,
    adminOccupancy,
    adminForecast,
    allocations,
    tickets,
    isLoadingData,
    refreshData,
    createStaffAccount,
    setStaffAccountStatus
  } = useApp();

  const [activeTab, setActiveTab] = useState<'occupancy' | 'forecast' | 'staff'>('occupancy');

  // Create Staff Form
  const [staffRole, setStaffRole] = useState<'WARDEN' | 'HOUSING_ADMIN'>('WARDEN');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffHostelId, setStaffHostelId] = useState('');
  const [staffEmpCode, setStaffEmpCode] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<Array<{ account_id: string; email: string; role: string; status: 'ACTIVE' | 'SUSPENDED' }>>([]);

  // Manual Status Update Form (by account_id)
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'SUSPENDED'>('SUSPENDED');

  const totalCapacity = adminOccupancy.reduce((sum, i) => sum + Number(i.total_capacity || 0), 0);
  const totalHeld = adminOccupancy.reduce((sum, i) => sum + Number(i.held_beds || 0), 0);
  const totalAllocated = adminOccupancy.reduce((sum, i) => sum + Number(i.allocated_beds || 0), 0);
  const occupancyPercentage = totalCapacity > 0 ? Math.round(((totalAllocated + totalHeld) / totalCapacity) * 100) : 0;

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingStaff) return;
    setCreatingStaff(true);
    try {
      const created = await createStaffAccount({
        email: staffEmail.trim(),
        full_name: staffName.trim(),
        role: staffRole,
        password: staffPassword,
        hostel_id: staffRole === 'WARDEN' ? (staffHostelId || hostels[0]?.hostel_id) : undefined,
        employee_code: staffRole === 'WARDEN' ? staffEmpCode.trim() : undefined,
      });
      if (created) {
        setCreatedAccounts((prev) => [{ account_id: created.account_id, email: created.email, role: created.role, status: 'ACTIVE' }, ...prev]);
        setStaffName('');
        setStaffEmail('');
        setStaffPassword('');
        setStaffEmpCode('');
      }
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleToggleStatus = async (accountId: string, nextStatus: 'ACTIVE' | 'SUSPENDED') => {
    const ok = await setStaffAccountStatus(accountId, nextStatus);
    if (ok) {
      setCreatedAccounts((prev) =>
        prev.map((a) => (a.account_id === accountId ? { ...a, status: nextStatus } : a))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 mb-1">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Campus Housing Administration & Directorate</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Management & Oversight</h1>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser?.full_name} • {currentUser?.email} • Allocations: {allocations.length} • Tickets: {tickets.length}
          </p>
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="mt-2 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 inline-flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Refresh Live Metrics</span>
          </button>
        </div>

        {/* Aggregate KPI Badges from /admin/occupancy */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Beds</span>
            <span className="text-lg font-bold text-white">{totalCapacity}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Occupied & Held</span>
            <span className="text-lg font-bold text-indigo-400">{totalAllocated + totalHeld}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Occupancy Rate</span>
            <span className="text-lg font-bold text-emerald-400">{occupancyPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'occupancy' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Live Hostel Occupancy ({adminOccupancy.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'forecast' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Demand Forecast (Illustrative)</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'staff' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Account Management</span>
        </button>
      </div>

      {/* TAB 1: LIVE OCCUPANCY FROM /admin/occupancy */}
      {activeTab === 'occupancy' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Hostel-Wise Bed Occupancy (Database Live)</h3>
            <p className="text-xs text-slate-500">Aggregated directly from PostgreSQL `bed_inventory` via `GET /admin/occupancy`.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Hostel</th>
                  <th className="p-4">Policy</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Available</th>
                  <th className="p-4">Held</th>
                  <th className="p-4">Allocated</th>
                  <th className="p-4">Occupancy %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminOccupancy.map((row) => (
                  <tr key={row.hostel_id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{row.name}</td>
                    <td className="p-4 font-mono">{row.gender_policy}</td>
                    <td className="p-4 font-mono">{row.total_capacity}</td>
                    <td className="p-4 font-mono text-emerald-700 font-bold">{row.available_beds}</td>
                    <td className="p-4 font-mono text-amber-700">{row.held_beds}</td>
                    <td className="p-4 font-mono text-indigo-700 font-bold">{row.allocated_beds}</td>
                    <td className="p-4 font-mono font-bold">{row.occupancy_pct ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ILLUSTRATIVE FORECAST FROM /admin/forecast */}
      {activeTab === 'forecast' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Occupancy Demand Forecast</h3>
              <p className="text-xs text-slate-500">
                Retrieved from `GET /admin/forecast` (static illustrative projection model — not calculated from live database history).
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
              Illustrative Projection
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Period</th>
                  <th className="p-4">Intake Cohort</th>
                  <th className="p-4">Actual</th>
                  <th className="p-4">Predicted</th>
                  <th className="p-4">Surge Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminForecast.map((f) => (
                  <tr key={f.period} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{f.period}</td>
                    <td className="p-4 text-slate-600">{f.intake}</td>
                    <td className="p-4 font-mono">{f.actual ?? '—'}</td>
                    <td className="p-4 font-mono font-bold text-indigo-700">{f.predicted}</td>
                    <td className="p-4 font-semibold">{f.surge_probability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF ACCOUNT MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleCreateStaff} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Create Staff Account (`POST /admin/accounts`)</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as 'WARDEN' | 'HOUSING_ADMIN')}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="WARDEN">WARDEN</option>
                  <option value="HOUSING_ADMIN">HOUSING_ADMIN</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Dr. Kavita Rao"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@example.test"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Initial Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {staffRole === 'WARDEN' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Hostel</label>
                  <select
                    value={staffHostelId || hostels[0]?.hostel_id || ''}
                    onChange={(e) => setStaffHostelId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {hostels.map((h) => (
                      <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={staffEmpCode}
                    onChange={(e) => setStaffEmpCode(e.target.value)}
                    placeholder="EMP-WRD-101"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={creatingStaff}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold transition"
            >
              {creatingStaff ? 'Creating...' : 'Create Staff Account'}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Account Status Control (`PATCH /admin/accounts/:id/status`)</h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Account UUID"
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="flex-1 p-2.5 rounded-lg border border-slate-300 font-mono"
              />
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                className="p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
              <button
                type="button"
                onClick={() => targetAccountId.trim() && handleToggleStatus(targetAccountId.trim(), targetStatus)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                Apply
              </button>
            </div>

            {createdAccounts.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="font-semibold text-slate-700">Recently Created in This Session</div>
                {createdAccounts.map((acc) => (
                  <div key={acc.account_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{acc.email} ({acc.role})</div>
                      <div className="font-mono text-[10px] text-slate-500">{acc.account_id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(acc.account_id, acc.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                      className={`px-3 py-1 rounded-lg font-bold ${
                        acc.status === 'ACTIVE' ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {acc.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
