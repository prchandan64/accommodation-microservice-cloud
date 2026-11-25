import React from 'react';
import { Allocation } from '../../types';
import {
  Download,
  Printer,
  QrCode,
  ShieldCheck,
  Building,
  Calendar,
  User,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface RoomPassProps {
  allocation: Allocation;
}

export const RoomPass: React.FC<RoomPassProps> = ({ allocation }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-2xl mx-auto my-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-8 -translate-y-8">
          <QrCode className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official University Boarding Pass</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">ROOM ALLOTMENT PASS</h2>
            <p className="text-xs text-emerald-100 mt-1">Student Mobility & Lifestyle Platform • Accommodation Hub</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-400 text-emerald-950 shadow">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {allocation.status}
            </span>
            <div className="text-[11px] font-mono text-emerald-200 mt-1.5">{allocation.allotment_pass_code}</div>
          </div>
        </div>
      </div>

      {/* Pass Body */}
      <div className="p-6 space-y-6">
        {/* Student & Room Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Hostel</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{allocation.hostel_name}</div>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Room No.</span>
            <div className="font-bold text-emerald-700 text-base mt-0.5">{allocation.room_number}</div>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Bed Label</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{allocation.bed_label}</div>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Air Conditioned</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{allocation.is_ac ? 'Yes (Split AC)' : 'Standard Non-AC'}</div>
          </div>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <User className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-400 block">Resident Student</span>
                <span className="font-semibold text-slate-800">{allocation.student_name}</span>
                <span className="text-xs text-slate-500 ml-2 font-mono">({allocation.enrollment_no})</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-400 block">Term Validity</span>
                <span className="font-medium text-slate-700">{allocation.start_date} to {allocation.end_date}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <Building className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-400 block">Block & Wing</span>
                <span className="font-medium text-slate-700">{allocation.block_code} • {allocation.hostel_name}</span>
              </div>
            </div>
          </div>

          {/* QR Code Simulation & Barcode */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300">
            <div className="w-28 h-28 bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center relative">
              <QrCode className="w-24 h-24 text-slate-800" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  SAD
                </div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="font-mono text-xs font-bold tracking-widest text-slate-700">{allocation.allotment_pass_code}</div>
              <div className="text-[10px] text-slate-400">Scan at Hostel Entrance for Warden Check-in</div>
            </div>
          </div>
        </div>

        {/* Verification Check & Rules */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Check-in Protocol:</span> Present this digital pass or printed QR code to Warden Dr. Suresh Kumar upon arrival. Bed allocation is physically verified and room condition inspection checklist will be executed prior to key issuance.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
