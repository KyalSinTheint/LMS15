import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import type { PasswordResetRequest, Profile } from '../../types/lms';
import { closeOnBackdrop } from '../../lib/closeOnOutside';
import { getUserAvatar, avatarFallbackOnError } from '../../lib/avatar';

const STATUS_STYLES: Record<PasswordResetRequest['status'], { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Temporary password issued', cls: 'bg-sky-50 text-[#176B98] border-sky-200' },
  completed: { label: 'New password set', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
  expired: { label: 'Expired (not used)', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Replaced by newer request', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const timeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const UserLine: React.FC<{ user?: Profile; fallback: string }> = ({ user, fallback }) => (
  <div className="flex items-center gap-3 min-w-0">
    {user ? (
      <img
        src={getUserAvatar(user)}
        onError={avatarFallbackOnError(user.id)}
        alt=""
        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
    )}
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name || fallback}</p>
      <p className="text-[11px] text-slate-500 truncate">
        {[user?.email, user?.employee_id, user?.department].filter(Boolean).join(' · ') || fallback}
      </p>
    </div>
  </div>
);

export const PasswordResetRequestsPanel: React.FC = () => {
  const {
    profiles,
    passwordResetRequests,
    passwordResetSetupReady,
    loadPasswordResetRequests,
    approvePasswordResetRequest,
    rejectPasswordResetRequest,
  } = useLms();
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState<PasswordResetRequest | null>(null);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ user?: Profile; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const pending = passwordResetRequests.filter((r) => r.status === 'pending');
  const history = passwordResetRequests.filter((r) => r.status !== 'pending').slice(0, 30);

  const refresh = async () => {
    setRefreshing(true);
    await loadPasswordResetRequests();
    setRefreshing(false);
  };

  const approve = async () => {
    if (!confirming) return;
    setBusyId(confirming.id);
    const res = await approvePasswordResetRequest(confirming.id);
    setBusyId(null);
    if (res.success && res.tempPassword) {
      setIssued({ user: profileById.get(confirming.user_id), password: res.tempPassword });
      setCopied(false);
    }
    setConfirming(null);
    setIdentityChecked(false);
  };

  const reject = async (request: PasswordResetRequest) => {
    setBusyId(request.id);
    await rejectPasswordResetRequest(request.id);
    setBusyId(null);
  };

  const copyPassword = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#176B98]" />
            Password Reset Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Employees who forgot their password ask for a reset on the sign-in page. Confirm it is really them (phone call or
            in person), then approve to get a one-time temporary password, valid for 24 hours. They must choose a new password
            when they sign in with it.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="self-start px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!passwordResetSetupReady && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Password reset requests are not available yet</p>
            <p className="mt-1 leading-relaxed">Please ask the system developer to finish the setup, then press Refresh.</p>
          </div>
        </div>
      )}

      {/* Pending */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Waiting for approval
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              pending.length ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-slate-500">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((request) => {
              const user = profileById.get(request.user_id);
              return (
                <li key={request.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <UserLine user={user} fallback={request.identifier} />
                    <p className="text-[11px] text-slate-500 pl-[52px]">
                      Requested {timeAgo(request.created_at)} with “{request.identifier}”
                      {request.reason ? (
                        <>
                          {' '}
                          · <span className="italic text-slate-600">“{request.reason}”</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-[52px] md:pl-0">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(request);
                        setIdentityChecked(false);
                      }}
                      disabled={busyId === request.id}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(request)}
                      disabled={busyId === request.id}
                      className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* History */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent history</h3>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-slate-500">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((request) => {
              const user = profileById.get(request.user_id);
              const style = STATUS_STYLES[request.status];
              return (
                <li key={request.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <UserLine user={user} fallback={request.identifier} />
                  <div className="flex flex-col sm:items-end gap-1 pl-[52px] sm:pl-0">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${style.cls}`}>{style.label}</span>
                    <span className="text-[11px] text-slate-400">
                      {request.resolved_by_name ? `by ${request.resolved_by_name} · ` : ''}
                      {timeAgo(request.completed_at || request.resolved_at || request.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Confirm identity before approving */}
      {confirming &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            {...closeOnBackdrop(() => setConfirming(null))}
          >
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-left">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#176B98]" />
                Approve password reset?
              </h3>
              <UserLine user={profileById.get(confirming.user_id)} fallback={confirming.identifier} />
              <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
                <li>Their current password stops working and they are signed out on all devices.</li>
                <li>You will see a temporary password once. Give it to them privately.</li>
                <li>It works for 24 hours, and they must set a new password when they sign in.</li>
              </ul>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={identityChecked}
                  onChange={(e) => setIdentityChecked(e.target.checked)}
                  className="mt-0.5 accent-[#176B98]"
                />
                <span>
                  I have confirmed this request really comes from{' '}
                  <strong>{profileById.get(confirming.user_id)?.full_name || confirming.identifier}</strong> (by phone or in
                  person).
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={approve}
                  disabled={!identityChecked || busyId === confirming.id}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busyId === confirming.id ? 'Approving…' : 'Approve & create temporary password'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Temporary password, shown once */}
      {issued &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-left">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Temporary password created
              </h3>
              <p className="text-xs text-slate-600">
                For <strong>{issued.user?.full_name || 'this employee'}</strong>
                {issued.user?.email ? ` (${issued.user.email})` : ''}
              </p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 text-white">
                <code className="flex-1 text-center text-xl font-mono font-bold tracking-widest select-all">{issued.password}</code>
                <button
                  type="button"
                  onClick={copyPassword}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">This is shown only once.</p>
                <p>Give it to the employee privately (in person, phone call or direct message). It expires in 24 hours.</p>
              </div>
              <button
                type="button"
                onClick={() => setIssued(null)}
                className="w-full py-2.5 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold cursor-pointer"
              >
                I have given it to the employee — Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
