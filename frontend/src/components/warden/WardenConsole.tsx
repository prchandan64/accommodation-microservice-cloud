import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Allocation, RoomCondition } from '../../types';
import { formatTermPeriod } from '../../utils/format';
import {
  ShieldCheck,
  UserCheck,
  Wrench,
  Repeat,
  Layers,
  Check,
  X,
  ClipboardList,
  RefreshCw
} from 'lucide-react';

export const WardenConsole: React.FC = () => {
  const {
    currentUser,
    hostels,
    allocations,
    swapRequests,
    tickets,
    isLoadingData,
    refreshData,
    checkInStudent,
    approveSwapRequest,
    rejectSwapRequest,
    updateTicketStatus
  } = useApp();

  const [activeTab, setActiveTab] = useState<'checkin' | 'swaps' | 'maintenance' | 'rooms'>('checkin');

  // Check In Modal State
  const [inspectingAlloc, setInspectingAlloc] = useState<Allocation | null>(null);
  const [conditionGrade, setConditionGrade] = useState<RoomCondition>('GOOD');
  const [conditionNotes, setConditionNotes] = useState('Room clean, 1 table, 1 chair, 1 wardrobe, 1 AC remote verified.');

  // Expected Arrivals: Allocated but not yet checked in
  const expectedArrivals = allocations.filter((a) => a.status === 'ALLOCATED');
  const checkedInResidents = allocations.filter((a) => a.status === 'CHECKED_IN');

  const assignedHostel =
    hostels.find((h) => h.hostel_id === currentUser?.warden_profile?.hostel_id)?.name ||
    allocations[0]?.hostel_name ||
    'Assigned Hostel';

  const handleConfirmCheckIn = async () => {
    if (!inspectingAlloc) return;
    await checkInStudent(inspectingAlloc.allocation_id, conditionGrade, conditionNotes);
    setInspectingAlloc(null);
  };

  return (
    <div className="space-y-6">
      {/* Warden Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Hostel Warden Console • {assignedHostel}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Supervisory & Inspection Station</h1>
          <p className="text-xs text-slate-400 mt-1">
            Active Supervisor: {currentUser?.full_name} • {currentUser?.email} • Check-ins, Condition Inspections & Swaps
          </p>
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="mt-2 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 inline-flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Refresh Hostel Records</span>
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending Arrivals</span>
            <span className="text-lg font-bold text-amber-400">{expectedArrivals.length}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Checked-In</span>
            <span className="text-lg font-bold text-emerald-400">{checkedInResidents.length}</span>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Open Tickets</span>
            <span className="text-lg font-bold text-rose-400">
              {tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'checkin'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Expected Arrivals & Room Condition ({expectedArrivals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('swaps')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'swaps'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Room Swap Approvals ({swapRequests.filter((s) => s.status === 'REQUESTED').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'maintenance'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Hostel Maintenance Queue ({tickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'rooms'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Resident Roster & Beds</span>
        </button>
      </div>

      {/* TAB 1: ARRIVALS & CHECK-IN INSPECTIONS */}
      {activeTab === 'checkin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Arriving Students Checklist</h3>
                <p className="text-xs text-slate-500">
                  Verify student identity pass code, conduct room condition inspection, and approve official check-in.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
                {expectedArrivals.length} Awaiting Verification
              </span>
            </div>

            {expectedArrivals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                All allocated students have completed their physical check-in and room inspection!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Pass Code</th>
                      <th className="py-3 px-4">Resident Student</th>
                      <th className="py-3 px-4">Room & Bed</th>
                      <th className="py-3 px-4">Hostel / Wing</th>
                      <th className="py-3 px-4">Term Period</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expectedArrivals.map((alloc) => (
                      <tr key={alloc.allocation_id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {alloc.allotment_pass_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{alloc.student_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{alloc.enrollment_no}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{alloc.room_number}</span>
                          <span className="text-slate-500 ml-1">({alloc.bed_label})</span>
                          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {alloc.is_ac ? 'AC' : 'Non-AC'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{alloc.hostel_name}</td>
                        <td className="py-3 px-4 text-slate-500">{formatTermPeriod(alloc.start_date, alloc.end_date)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setInspectingAlloc(alloc)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
                          >
                            Inspect & Check-In
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently Checked-In Records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Checked-In Residents ({checkedInResidents.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checkedInResidents.map((ci) => (
                <div key={ci.allocation_id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{ci.student_name}</span>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                      {ci.status}
                    </span>
                  </div>
                  <div className="text-slate-600 font-medium">Room {ci.room_number} ({ci.bed_label}) • {ci.hostel_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Pass: {ci.allotment_pass_code} • {ci.enrollment_no}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROOM SWAP APPROVALS */}
      {activeTab === 'swaps' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Student Room Swap Requests</h3>
              <p className="text-xs text-slate-500">
                Warden verifies medical justifications, academic grounds, and gender policy compliance before approving bed swaps.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {swapRequests.map((swap) => (
              <div
                key={swap.swap_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{swap.student_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        swap.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : swap.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {swap.status}
                    </span>
                  </div>
                  <div className="text-slate-700">
                    Current: <span className="font-semibold">{swap.current_room} ({swap.current_bed})</span> ➔ Requested:{' '}
                    <span className="font-semibold text-emerald-800">{swap.target_bed_label || 'Ground Floor'}</span>
                  </div>
                  <div className="text-slate-500 italic">Reason: "{swap.reason}"</div>
                </div>

                {swap.status === 'REQUESTED' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => approveSwapRequest(swap.swap_id, 'Approved on medical/academic grounds.')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Swap</span>
                    </button>
                    <button
                      onClick={() => rejectSwapRequest(swap.swap_id, 'No vacant ground floor beds available currently.')}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-semibold text-xs flex items-center space-x-1 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MAINTENANCE QUEUE */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hostel Maintenance & Repair Queue</h3>
              <p className="text-xs text-slate-500">
                Tickets prioritized by severity (Urgent, High, Medium). Wardens assign technicians and update resolution state.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.ticket_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        t.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({t.category})</span>
                  </div>
                  <div className="text-slate-700">
                    Hostel: <span className="font-semibold">{t.hostel_name}</span> • Room: <span className="font-semibold">{t.room_number}</span>
                  </div>
                  <div className="text-slate-500">{t.description}</div>
                  {t.resolution_notes && (
                    <div className="text-emerald-800 bg-emerald-50 p-2 rounded text-[11px] font-medium border border-emerald-100">
                      Resolution: {t.resolution_notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {t.status !== 'RESOLVED' && (
                    <button
                      onClick={() => updateTicketStatus(t.ticket_id, 'RESOLVED', 'Inspected and repaired by campus maintenance staff.')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {t.status === 'OPEN' && (
                    <button
                      onClick={() => updateTicketStatus(t.ticket_id, 'IN_PROGRESS', 'Technician dispatched.')}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      Dispatch Tech
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RESIDENTS ROSTER */}
      {activeTab === 'rooms' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Current Resident Allocations ({allocations.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Enrollment No.</th>
                  <th className="py-2.5 px-3">Hostel</th>
                  <th className="py-2.5 px-3">Room / Bed</th>
                  <th className="py-2.5 px-3">Pass Code</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a) => (
                  <tr key={a.allocation_id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{a.student_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{a.enrollment_no}</td>
                    <td className="py-2.5 px-3 text-slate-600">{a.hostel_name}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{a.room_number} ({a.bed_label})</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{a.allotment_pass_code}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 uppercase">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Physical Inspection & Check-in Modal */}
      {inspectingAlloc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Physical Room Condition Inspection</h3>
              </div>
              <button onClick={() => setInspectingAlloc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{inspectingAlloc.student_name}</div>
                <div className="text-slate-600 font-mono">
                  {inspectingAlloc.allotment_pass_code} • {inspectingAlloc.hostel_name} Room {inspectingAlloc.room_number} ({inspectingAlloc.bed_label})
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Room Condition Grade
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GOOD', 'FAIR', 'NEEDS_REPAIR'] as const).map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setConditionGrade(grade)}
                      className={`p-2.5 rounded-lg border font-bold text-xs transition ${
                        conditionGrade === grade
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Warden Inspection Notes & Key Issuance
                </label>
                <textarea
                  rows={3}
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => setInspectingAlloc(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCheckIn}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
                >
                  Stamp Verified & Issue Room Keys
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
