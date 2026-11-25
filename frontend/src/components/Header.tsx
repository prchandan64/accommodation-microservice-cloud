import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  Clock,
  LogIn,
  LogOut,
  GraduationCap
} from 'lucide-react';

interface HeaderProps {
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const { currentUser, logout, activeHoldTimer, isBackendLive, wsConnected } = useApp();

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Platform Top Notification Bar */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-4 py-1.5 text-xs font-medium text-emerald-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Student Mobility & Lifestyle Platform</span>
          <span className="text-emerald-300">|</span>
          <span className="font-semibold text-white">Microservice 2: Hostels and Housing</span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-slate-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
            {isBackendLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300 font-semibold text-[11px]">
                  API Live {wsConnected ? '• WS Connected' : ''}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span className="text-rose-200 text-[11px]">Backend Offline</span>
              </>
            )}
          </div>
          <span className="text-emerald-300 hidden sm:inline">|</span>
          <span className="bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-300 hidden sm:inline">
            PostgreSQL 16
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Service Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Accommodation Hub</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  INR (₹)
                </span>
              </div>
              <p className="text-xs text-slate-400">Hostel Allocation & Residence Management</p>
            </div>
          </div>

          {/* Active Hold Countdown */}
          {activeHoldTimer !== null && activeHoldTimer > 0 && (
            <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg text-xs animate-pulse font-mono">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>HOLD TIMER:</span>
              <span className="font-bold text-amber-200 text-sm">{formatTimer(activeHoldTimer)}</span>
            </div>
          )}

          {/* Authenticated User / Sign In */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <>
                <span
                  className={`hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                    currentUser.role === 'STUDENT'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                      : currentUser.role === 'WARDEN'
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                      : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  }`}
                >
                  {currentUser.role === 'STUDENT' ? (
                    <GraduationCap className="w-3.5 h-3.5" />
                  ) : currentUser.role === 'WARDEN' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{currentUser.role}</span>
                </span>

                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-slate-200">{currentUser.full_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{currentUser.email}</div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
