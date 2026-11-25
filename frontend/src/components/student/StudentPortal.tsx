import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { RoomRecommender } from './RoomRecommender';
import { PaymentModal } from './PaymentModal';
import { RoomPass } from './RoomPass';
import {
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Shield,
  Wind,
  Wrench,
  Repeat,
  FileText,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Allocation, HostelApplication } from '../../types';

export const StudentPortal: React.FC = () => {
  const {
    currentUser,
    inventories,
    applications,
    allocations,
    terms,
    isLoadingData,
    refreshData,
    applyAndHoldBed,
    cancelApplication,
    requestRoomSwap,
    submitMaintenanceTicket,
    tickets,
    swapRequests
  } = useApp();

  const [activeTab, setActiveTab] = useState<'catalogue' | 'ai_recommender' | 'pass' | 'swaps' | 'tickets'>('catalogue');
  const [selectedInventoryForPay, setSelectedInventoryForPay] = useState<HostelApplication | null>(null);
  const [passDetail, setPassDetail] = useState<Allocation | null>(null);

  // Filters
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE' | 'MIXED'>('ALL');
  const [acFilter, setAcFilter] = useState<boolean | null>(null);

  // Swap Request Form
  const [swapReason, setSwapReason] = useState('');
  const [swapTarget, setSwapTarget] = useState('');

  // Ticket Form
  const [tktCategory, setTktCategory] = useState<'PLUMBING' | 'ELECTRICAL' | 'FURNITURE' | 'CLEANING' | 'NETWORK'>('ELECTRICAL');
  const [tktPriority, setTktPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [tktTitle, setTktTitle] = useState('');
  const [tktDesc, setTktDesc] = useState('');

  // Backend /allocations/me & /availability are already scoped to the authenticated student
  const myApplications = applications;
  const myAllocations = allocations.filter((a) => a.status !== 'CANCELLED');
  const activeHoldApplication = myApplications.find((a) => a.status === 'HELD');
  const openTerm = terms.find((t) => t.status === 'OPEN');

  useEffect(() => {
    const loadPass = async () => {
      if (activeTab === 'pass' && myAllocations.length > 0) {
        try {
          const p = await api.getRoomPass(myAllocations[0].allocation_id);
          setPassDetail(p);
        } catch {
          setPassDetail(myAllocations[0]);
        }
      }
    };
    loadPass();
  }, [activeTab, myAllocations]);

  // Filtered Inventories
  const filteredInventories = inventories.filter((inv) => {
    if (genderFilter !== 'ALL' && inv.gender_policy !== genderFilter) return false;
    if (acFilter !== null && inv.is_ac !== acFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Welcome back, {currentUser?.full_name}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-mono">{currentUser?.email}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hostel & Housing Allocation Desk</h1>
          <p className="text-xs text-slate-400 mt-1">
            {openTerm ? `Active Term: ${openTerm.name} (${openTerm.status})` : 'Viewing Real-Time Backend Availability'}
          </p>
        </div>

        <button
          onClick={() => refreshData()}
          disabled={isLoadingData}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>

        {/* Quick status badge */}
        <div className="flex items-center space-x-3">
          {myAllocations.length > 0 ? (
            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400">Allocated Room</span>
                <div className="font-bold text-white text-sm">
                  {myAllocations[0].hostel_name} • {myAllocations[0].room_number} ({myAllocations[0].bed_label})
                </div>
              </div>
            </div>
          ) : activeHoldApplication ? (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 p-3 rounded-xl flex items-center space-x-3">
              <Clock className="w-6 h-6 text-amber-400 animate-spin" />
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400">Bed Held (Action Needed)</span>
                <div className="font-bold text-white text-sm">Payment Pending</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/80 border border-slate-700 text-slate-300 p-3 rounded-xl text-xs">
              <span className="font-semibold text-emerald-400">Booking Window Active</span>
              <p className="text-slate-400 mt-0.5">Select a bed below or try the AI Recommender.</p>
            </div>
          )}
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('catalogue')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'catalogue'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hostel Catalogue & Bed Booking</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_recommender')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'ai_recommender'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span>AI Room Recommender</span>
        </button>

        {myAllocations.length > 0 && (
          <button
            onClick={() => setActiveTab('pass')}
            className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
              activeTab === 'pass'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Digital Allotment Pass</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('swaps')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'swaps'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Room Swap Desk</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`py-2.5 px-4 rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'tickets'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Maintenance Desk ({tickets.length})</span>
        </button>
      </div>

      {/* Active Hold Alert Banner (If Any) */}
      {activeHoldApplication && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white animate-spin" />
            </div>
            <div>
              <div className="font-bold text-sm">Bed Temporarily Held in {activeHoldApplication.inventory?.hostel_name}</div>
              <p className="text-xs text-amber-100">
                Category: {activeHoldApplication.inventory?.room_type_name}. Complete the payment before the 30-minute hold window closes!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedInventoryForPay(activeHoldApplication)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-amber-900 rounded-xl font-bold text-xs shadow transition"
            >
              Pay Now (₹{(activeHoldApplication.inventory?.rent_amount || 0) + (activeHoldApplication.inventory?.deposit_amount || 0)})
            </button>
            <button
              onClick={() => cancelApplication(activeHoldApplication.application_id)}
              className="text-xs text-amber-100 hover:text-white underline"
            >
              Cancel Hold
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: CATALOGUE & BED BOOKING */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Filter Hostels:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                {(['ALL', 'MALE', 'FEMALE', 'MIXED'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      genderFilter === g
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {g === 'ALL' ? 'All Hostels' : `${g} Policy`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">AC:</span>
              <button
                onClick={() => setAcFilter(acFilter === true ? null : true)}
                className={`px-3 py-1.5 rounded-md border font-medium transition ${
                  acFilter === true
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Split AC Only
              </button>
              <button
                onClick={() => setAcFilter(acFilter === false ? null : false)}
                className={`px-3 py-1.5 rounded-md border font-medium transition ${
                  acFilter === false
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Standard (Non-AC)
              </button>
            </div>
          </div>

          {/* Bed Inventory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInventories.map((item) => {
              const isEligibleGender = true; // Backend /availability already filters by student's gender policy
              const hasActiveHold = activeHoldApplication !== undefined;
              const isAlreadyAllocated = myAllocations.length > 0;

              return (
                <div
                  key={item.inventory_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                >
                  <div className="p-5">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.gender_policy} Policy
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          item.beds_available > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.beds_available > 0 ? `${item.beds_available} Beds Free` : 'Fully Occupied'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{item.hostel_name}</h3>
                    <div className="text-xs text-emerald-700 font-semibold mb-3">{item.room_type_name}</div>

                    {/* Features list */}
                    <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Wind className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.is_ac ? 'Split AC Included' : 'Natural Cross-Ventilation (Non-AC)'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.has_attached_bathroom ? 'Private Attached Bath' : 'Shared Floor Washrooms'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Total Bed Pool: {item.beds_total} beds ({item.beds_allocated} Allocated, {item.beds_held} Held)</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <div className="flex justify-between items-baseline mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Semester Rent</span>
                        <span className="font-mono font-bold text-slate-900 text-base">
                          ₹{item.rent_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deposit (Refundable)</span>
                        <span className="font-mono text-slate-600 text-xs font-medium">
                          + ₹{item.deposit_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {!isEligibleGender ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                      >
                        Gender Policy Mismatch ({item.gender_policy} only)
                      </button>
                    ) : isAlreadyAllocated ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold cursor-not-allowed"
                      >
                        Already Allocated a Bed
                      </button>
                    ) : item.beds_available <= 0 ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-400 text-xs font-semibold cursor-not-allowed"
                      >
                        No Vacancy
                      </button>
                    ) : (
                      <button
                        onClick={() => applyAndHoldBed(item.inventory_id)}
                        disabled={hasActiveHold}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                      >
                        <span>Apply & Hold Bed</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AI ROOM RECOMMENDER */}
      {activeTab === 'ai_recommender' && (
        <RoomRecommender
          onSelectRoom={(inventoryId) => {
            applyAndHoldBed(inventoryId);
            setActiveTab('catalogue');
          }}
        />
      )}

      {/* TAB 3: DIGITAL ALLOTMENT PASS */}
      {activeTab === 'pass' && myAllocations.length > 0 && (
        <RoomPass allocation={passDetail || myAllocations[0]} />
      )}

      {/* TAB 4: ROOM SWAP DESK */}
      {activeTab === 'swaps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submit Swap Request Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Repeat className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Request Bed / Room Swap</h3>
            </div>
            <p className="text-xs text-slate-500">
              Submit an official request to your Hostel Warden for moving to a different room or floor (e.g. medical grounds or study group).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Room / Preference</label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor Room A-102 or Wing B"
                  value={swapTarget}
                  onChange={(e) => setSwapTarget(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Swap Request</label>
                <textarea
                  rows={3}
                  placeholder="Explain the circumstance (e.g. knee surgery requiring ground floor, academic project alignment)..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={() => {
                  if (swapReason && swapTarget) {
                    requestRoomSwap(swapReason, swapTarget);
                    setSwapReason('');
                    setSwapTarget('');
                  }
                }}
                disabled={!swapReason || !swapTarget}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50"
              >
                Submit Swap Application to Warden
              </button>
            </div>
          </div>

          {/* My Swap Requests List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">My Swap Applications</h3>
            <div className="space-y-3">
              {swapRequests.map((req) => (
                <div key={req.swap_id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Current: {req.current_room} ({req.current_bed})</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-slate-600">Target: <span className="font-medium">{req.target_bed_label || 'Ground Floor'}</span></div>
                  <div className="text-slate-500 italic">"{req.reason}"</div>
                  {req.decision_note && (
                    <div className="text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 mt-2">
                      <span className="font-bold">Warden Note:</span> {req.decision_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MAINTENANCE TICKETS */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submit Maintenance Ticket */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Report Maintenance Issue</h3>
            </div>
            <p className="text-xs text-slate-500">
              Report plumbing, electrical, furniture or Wi-Fi faults for rapid warden & technician dispatch.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Issue Category</label>
                  <select
                    value={tktCategory}
                    onChange={(e: any) => setTktCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ELECTRICAL">Electrical (AC, Fan, Light)</option>
                    <option value="PLUMBING">Plumbing (Tap, Geyser, Drain)</option>
                    <option value="FURNITURE">Furniture (Desk, Bed frame)</option>
                    <option value="NETWORK">Wi-Fi & Network</option>
                    <option value="CLEANING">Cleaning & Waste</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Urgency Priority</label>
                  <select
                    value={tktPriority}
                    onChange={(e: any) => setTktPriority(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="LOW">Low (Minor cosmetic)</option>
                    <option value="MEDIUM">Medium (Standard 24h)</option>
                    <option value="HIGH">High (Essential service)</option>
                    <option value="URGENT">Urgent (Safety/Leakage)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Short Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Geyser tripping MCB after 5 minutes"
                  value={tktTitle}
                  onChange={(e) => setTktTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe when the issue started and exact symptoms..."
                  value={tktDesc}
                  onChange={(e) => setTktDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <button
                onClick={() => {
                  if (tktTitle && tktDesc) {
                    submitMaintenanceTicket(tktCategory, tktPriority, tktTitle, tktDesc);
                    setTktTitle('');
                    setTktDesc('');
                  }
                }}
                disabled={!tktTitle || !tktDesc}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50"
              >
                Log Ticket to Maintenance Desk
              </button>
            </div>
          </div>

          {/* Active Tickets List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Hostel Maintenance Tickets ({tickets.length})</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div key={t.ticket_id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{t.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        t.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Room {t.room_number} • Category: {t.category} • Status:{' '}
                    <span className="font-semibold text-emerald-700">{t.status}</span>
                  </div>
                  <div className="text-slate-500">{t.description}</div>
                  {t.assigned_to && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      Assigned technician: <span className="font-medium text-slate-800">{t.assigned_to}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Simulation Modal */}
      {selectedInventoryForPay && (
        <PaymentModal
          application={selectedInventoryForPay}
          onClose={() => setSelectedInventoryForPay(null)}
        />
      )}
    </div>
  );
};
