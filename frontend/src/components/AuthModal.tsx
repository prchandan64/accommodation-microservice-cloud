import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../services/api';
import {
  X,
  Lock,
  KeyRound,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { completeLoginFromToken, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login + OTP state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  // Student Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEnroll, setRegEnroll] = useState('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [regCourse, setRegCourse] = useState('B.Tech');
  const [regYear, setRegYear] = useState(1);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const formatApiError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 429 && err.retryAfter) {
        return `${err.message} Retry after ${err.retryAfter}s.`;
      }
      if (err.details && typeof err.details === 'object') {
        const detailVals = Object.values(err.details).filter((v) => typeof v === 'string');
        if (detailVals.length > 0) {
          return `${err.message} (${detailVals.join('; ')})`;
        }
      }
      return err.message;
    }
    return err instanceof Error ? err.message : 'Request failed. Please try again.';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.login(email.trim(), password);
      setChallengeId(res.challenge_id);
      setOtpCode('');
      setStep('otp');
      showToast(res.message || 'A 6-digit verification code was sent.', 'info');
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !challengeId) return;
    setErrorMsg(null);
    const cleaned = otpCode.trim();
    if (!/^\d{6}$/.test(cleaned)) {
      setErrorMsg('Enter the 6-digit numeric verification code.');
      return;
    }
    setSubmitting(true);
    try {
      await api.verifyOtp(challengeId, cleaned);
      await completeLoginFromToken();
      setPassword('');
      setOtpCode('');
      showToast('Signed in successfully.', 'success');
      onClose();
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (submitting || !challengeId) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await api.resendOtp(challengeId);
      setChallengeId(res.challenge_id);
      setOtpCode('');
      showToast(res.message || 'A new 6-digit code was sent.', 'info');
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setRegSuccess(null);

    if (!regName.trim() || !regEmail.trim() || !regEnroll.trim() || regPassword.length < 8) {
      setErrorMsg('All required fields must be filled and password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.register({
        full_name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        enrollment_no: regEnroll.trim(),
        gender: regGender,
        course: regCourse.trim() || undefined,
        year_of_study: regYear,
      });
      setRegSuccess(`Account registered for ${created.email}. Please sign in with your credentials.`);
      setEmail(created.email);
      setRegPassword('');
      showToast('Student registration successful. Sign in to continue.', 'success');
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Authentication & 2FA Verification</h3>
              <p className="text-[11px] text-slate-400">Student • Warden • Housing Admin</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        {step === 'credentials' && (
          <div className="grid grid-cols-2 border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); }}
              className={`py-3 transition ${mode === 'login' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/40' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(null); setRegSuccess(null); }}
              className={`py-3 transition ${mode === 'register' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/40' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Student Register
            </button>
          </div>
        )}

        <div className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'register' && step === 'credentials' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {regSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between gap-2">
                  <span>{regSuccess}</span>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(null); }}
                    className="font-bold underline shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ananya Sharma"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">University Email *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Enrollment No. *</label>
                  <input
                    type="text"
                    required
                    value={regEnroll}
                    onChange={(e) => setRegEnroll(e.target.value)}
                    placeholder="2026CS001"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gender *</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Course</label>
                  <input
                    type="text"
                    value={regCourse}
                    onChange={(e) => setRegCourse(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Year</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={regYear}
                    onChange={(e) => setRegYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition flex items-center justify-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? 'Registering...' : 'Register Student Account'}</span>
              </button>
            </form>
          ) : step === 'credentials' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold transition"
              >
                {submitting ? 'Sending OTP...' : 'Sign In & Send 6-Digit OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Enter 6-Digit OTP Code</h4>
                <p className="text-slate-500 mt-1">A verification code was dispatched to {email}.</p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl font-mono tracking-widest p-3 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Verifying...' : 'Verify OTP & Sign In'}</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => { setStep('credentials'); setErrorMsg(null); }}
                  className="text-slate-500 hover:text-slate-800 text-[11px]"
                >
                  Back to credentials
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleResendOtp}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend Code</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
