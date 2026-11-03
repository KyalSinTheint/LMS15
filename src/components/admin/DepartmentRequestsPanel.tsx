/**
 * Admin → Dept Changes: employees' requests to move to another department.
 * Approving moves the employee and gives a new User ID for that department.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Building, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import {
  DepartmentChangeRequest,
  departmentLabel,
  listDepartmentRequests,
  resolveDepartmentRequest,
} from '../../lib/departmentRequests';

const STATUS: Record<DepartmentChangeRequest['status'], { label: string; cls: string }> = {
  pending: { label: 'Waiting for approval', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Replaced by a newer request', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const DepartmentRequestsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { showToast, refreshData } = useLms();
  const [requests, setRequests] = useState<DepartmentChangeRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setRequests(await listDepartmentRequests());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setRequests([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (r: DepartmentChangeRequest, approve: boolean) => {
    if (!approve && !window.confirm(`Reject ${r.user_name || 'this employee'}'s request?`)) return;
    setBusy(r.id);
    try {
      const code = await resolveDepartmentRequest(r.id, approve, notes[r.id]);
      showToast(
        approve ? 'success' : 'info',
        approve ? 'Department changed' : 'Request rejected',
        approve ? `${r.user_name} is now in ${departmentLabel(r.to_department, r.to_employment_type)}. New User ID: ${code}` : r.user_name || ''
      );
      await load();
      onChanged?.();
      if (approve) void refreshData();
    } catch (err) {
      showToast('error', 'Not saved', (err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const pending = (requests || []).filter((r) => r.status === 'pending');
  const shown = showAll ? requests || [] : pending;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building className="w-5 h-5 text-[#176B98]" /> Department Change Requests
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Employees cannot change their department themselves. Approving moves them and gives a new User ID for the new department.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {showAll ? `Show open only (${pending.length})` : 'Show history'}
          </button>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">{error}</p>}

      {requests === null ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
          {showAll ? 'No requests yet.' : 'No open requests. 🎉'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {r.user_name || 'Employee'}{' '}
                    {r.from_user_code && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/40 text-[#176B98] dark:text-sky-300 text-[10px] font-mono font-bold">
                        {r.from_user_code}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Requested {when(r.created_at)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                  {departmentLabel(r.from_department, r.from_employment_type)}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="px-2.5 py-1 rounded-lg bg-[#176B98]/10 text-[#176B98] dark:text-sky-300 font-bold">
                  {departmentLabel(r.to_department, r.to_employment_type)}
                </span>
                {r.to_user_code && <span className="text-[11px] text-slate-500">New User ID: <b className="font-mono">{r.to_user_code}</b></span>}
              </div>
              {r.reason && <p className="text-xs text-slate-600 dark:text-slate-300">Reason: {r.reason}</p>}
              {r.status !== 'pending' && (r.admin_note || r.resolved_by_name) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {r.resolved_by_name && `By ${r.resolved_by_name} · ${when(r.resolved_at)}`}
                  {r.admin_note && ` · Note: ${r.admin_note}`}
                </p>
              )}

              {r.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={notes[r.id] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Note to the employee (optional)"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => resolve(r, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => resolve(r, false)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
