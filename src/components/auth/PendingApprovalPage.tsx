import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, LogOut, Building, Mail, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { ApprovalSteps, AuthPageShell } from './ApprovalFlowScreens';

interface PendingApprovalPageProps {
  /** Called when approval is detected; the app then shows the "You're approved" screen. */
  onApprovalDetected: () => void;
  onLogout: () => void;
}

const POLL_INTERVAL_MS = 10000;

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onApprovalDetected, onLogout }) => {
  const { currentUser, checkUserApprovalStatus } = useLms();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Approval also arrives instantly via Supabase Realtime; polling is the fallback.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await checkUserApprovalStatus(currentUser.id);
        setLastChecked(new Date());
        if (status === 'approved' || status === 'active') onApprovalDetected();
      } catch {
        // keep polling quietly
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentUser.id, checkUserApprovalStatus, onApprovalDetected]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const status = await checkUserApprovalStatus(currentUser.id);
      setLastChecked(new Date());
      if (status === 'approved' || status === 'active') {
        onApprovalDetected();
      } else if (status === 'pending') {
        setStatusMessage('Still waiting for an administrator. You can leave this page open; it updates automatically.');
      }
    } catch {
      setStatusMessage('Could not reach the server. Please check your connection and try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const details = [
    { icon: <User className="w-4 h-4 text-slate-400 shrink-0" />, label: 'Full name', value: currentUser.full_name },
    {
      icon: <span className="w-4 text-center text-xs font-mono font-bold text-slate-400 shrink-0">@</span>,
      label: 'Username',
      value: currentUser.username || currentUser.email.split('@')[0],
    },
    { icon: <Mail className="w-4 h-4 text-slate-400 shrink-0" />, label: 'Email', value: currentUser.email },
    {
      icon: <Building className="w-4 h-4 text-slate-400 shrink-0" />,
      label: 'Department',
      value: currentUser.department || 'Not specified',
    },
  ];

  return (
    <AuthPageShell subtitle="Employee Learning Portal · Registration Review">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#176B98] text-white p-7 relative overflow-hidden">
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
              Status: Pending approval
            </span>
            <h2 className="text-2xl font-black mt-1.5 tracking-tight">Waiting for approval</h2>
            <p className="text-xs text-sky-100/90 mt-1 leading-relaxed">
              Thanks for registering, <strong className="text-white">{currentUser.full_name}</strong>. An LMS
              administrator is reviewing your employee details.
            </p>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      </div>

      <div className="p-6 sm:p-7 space-y-5">
        <ApprovalSteps
          steps={[
            { label: 'Registration submitted', hint: 'We received your LMS access request.', state: 'done' },
            {
              label: 'Administrator review',
              hint: 'This usually takes up to 1 business day. You will see the result here automatically.',
              state: 'current',
            },
            { label: 'Sign in and start learning', hint: 'Unlocks as soon as you are approved.', state: 'upcoming' },
          ]}
        />

        {/* Live status */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Checking automatically
          </span>
          <span className="text-slate-400 whitespace-nowrap">
            Last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5 bg-sky-50 border border-sky-200 text-slate-800" role="status">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
            <div className="font-medium leading-relaxed">{statusMessage}</div>
          </div>
        )}

        {/* Submitted details */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Submitted details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {details.map((d) => (
              <div key={d.label} className="flex items-center gap-2 min-w-0">
                {d.icon}
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold">{d.label}</div>
                  <div className="font-bold text-slate-900 truncate">{d.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Courses, training and company updates unlock after your identity and role are verified, in line with
            KBZLife compliance policy.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full py-2.5 px-4 rounded-xl bg-[#003366] hover:bg-[#176B98] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking…' : 'Check status now'}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </AuthPageShell>
  );
};
