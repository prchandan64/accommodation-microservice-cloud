import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HostelApplication } from '../../types';
import {
  X,
  CreditCard,
  QrCode,
  Building,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock
} from 'lucide-react';

interface PaymentModalProps {
  application: HostelApplication;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ application, onClose }) => {
  const { payForApplication, activeHoldTimer } = useApp();
  const [tab, setTab] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);

  const inv = application.inventory;
  const rent = inv?.rent_amount || 48000;
  const deposit = inv?.deposit_amount || 10000;
  const total = rent + deposit;

  const handlePay = async (token: 'tok_ok' | 'tok_fail') => {
    setProcessing(true);
    await payForApplication(application.application_id, token);
    setProcessing(false);
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base">Simulated INR Payment Gateway</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Demo Simulator
                </span>
              </div>
              <p className="text-xs text-slate-400">Simulated Academic Payment Adapter (No real card data collected)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hold Countdown Warning */}
        {activeHoldTimer !== null && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Bed Hold Window Active:</span>
            </div>
            <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              {formatTimer(activeHoldTimer)} remaining
            </span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Fee Breakdown Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Hostel Complex:</span>
              <span className="font-semibold text-slate-900">{inv?.hostel_name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Room Category:</span>
              <span className="font-semibold text-slate-900">{inv?.room_type_name}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
              <span>Term Rent (Semester):</span>
              <span className="font-mono font-semibold text-slate-800">₹{rent.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Refundable Caution Deposit:</span>
              <span className="font-mono font-semibold text-slate-800">₹{deposit.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
              <span>Total Payable Now:</span>
              <span className="text-emerald-700 font-mono text-base">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTab('upi')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  tab === 'upi'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1 text-emerald-600" />
                <span>UPI QR / VPA</span>
              </button>

              <button
                onClick={() => setTab('card')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  tab === 'card'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1 text-emerald-600" />
                <span>Debit / Credit Card</span>
              </button>

              <button
                onClick={() => setTab('netbanking')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  tab === 'netbanking'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building className="w-5 h-5 mb-1 text-emerald-600" />
                <span>Net Banking</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {tab === 'upi' && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <div className="w-32 h-32 bg-white p-2 rounded-xl shadow border border-slate-200 flex items-center justify-center">
                <QrCode className="w-28 h-28 text-slate-800" />
              </div>
              <p className="text-xs text-slate-600 mt-2 font-medium">Scan with Google Pay, PhonePe, or Paytm</p>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5">UPI ID: campus.mobility@sbi</span>
            </div>
          )}

          {tab === 'card' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium">Card Number</label>
                <input
                  type="text"
                  placeholder="4532 •••• •••• 8892"
                  disabled
                  value="4532 •••• •••• 8892"
                  className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-medium">Expiry</label>
                  <input
                    type="text"
                    disabled
                    value="12/28"
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium">CVV</label>
                  <input
                    type="password"
                    disabled
                    value="•••"
                    className="w-full mt-1 p-2.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'netbanking' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'].map((bank) => (
                <div
                  key={bank}
                  className="p-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 flex items-center space-x-2"
                >
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>{bank}</span>
                </div>
              ))}
            </div>
          )}

          {/* Security Assurance */}
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 justify-center">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit Encrypted SSL Gateway • ISO/IEC 27001 Certified</span>
          </div>

          {/* Action Buttons for Testing Success vs Failure */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <button
              onClick={() => handlePay('tok_ok')}
              disabled={processing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{processing ? 'Processing Payment...' : `Authorize ₹${total.toLocaleString('en-IN')} (Success Token: tok_ok)`}</span>
            </button>

            <button
              onClick={() => handlePay('tok_fail')}
              disabled={processing}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 font-medium text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate Bank Decline (Decline Token: tok_fail)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
