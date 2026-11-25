import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { StudentPortal } from './components/student/StudentPortal';
import { WardenConsole } from './components/warden/WardenConsole';
import { AdminConsole } from './components/admin/AdminConsole';
import { AuthModal } from './components/AuthModal';
import {
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Database,
  LogIn,
  Building2,
  Calendar
} from 'lucide-react';

const PublicLanding: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { hostels, terms, isBackendLive } = useApp();

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Campus Housing & Hostel Allocation
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Accommodation Hub</h1>
          <p className="text-sm text-slate-300">
            Sign in with your university credentials and 2FA OTP to browse real-time bed availability, reserve a room, view your allotment pass, or manage hostel operations.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg flex items-center space-x-2 shrink-0 transition"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In / Register</span>
        </button>
      </div>

      {!isBackendLive && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Backend service is currently unreachable. Please verify the API container is running.</span>
        </div>
      )}

      {/* Public Academic Terms */}
      {terms.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Academic Terms</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {terms.map((t) => (
              <div key={t.term_id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{t.name}</div>
                  <div className="text-slate-500 mt-0.5">{t.start_date} to {t.end_date}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public Hostel Catalogue */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>Campus Hostels ({hostels.length})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {hostels.map((h) => (
            <div key={h.hostel_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {h.image_url && (
                <img src={h.image_url} alt={h.name} className="w-full h-40 object-cover" />
              )}
              <div className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{h.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                    {h.gender_policy}
                  </span>
                </div>
                <p className="text-slate-600">{h.description}</p>
                <div className="text-[11px] text-slate-400 font-mono">{h.hostel_code} • {h.address}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { currentUser, toasts, removeToast } = useApp();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header onOpenAuth={() => setShowAuthModal(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser && <PublicLanding onOpenAuth={() => setShowAuthModal(true)} />}
        {currentUser?.role === 'STUDENT' && <StudentPortal />}
        {currentUser?.role === 'WARDEN' && <WardenConsole />}
        {currentUser?.role === 'HOUSING_ADMIN' && <AdminConsole />}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
              AM
            </div>
            <div>
              <div className="font-semibold text-slate-200">Accommodation Microservice</div>
              <div className="text-[11px] text-slate-500">Student Mobility & Lifestyle Platform • React + TS + Tailwind</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center space-x-1 text-slate-400">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>PostgreSQL 16 (GiST Exclusion Constraint)</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">FastAPI REST & WebSockets (/api/v1/accommodation)</span>
            <span>•</span>
            <span className="text-slate-400">INR Currency Ledger (₹)</span>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 rounded-xl shadow-lg border text-xs font-medium flex items-start justify-between space-x-2 transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            <div className="flex items-start space-x-2">
              {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
