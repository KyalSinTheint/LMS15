/**
 * Profile → "Request department change": employees cannot change their
 * department themselves; the request goes to the admins for approval.
 */
import React, { useEffect, useState } from 'react';
import { Building, Clock, Send } from 'lucide-react';
import type { Profile } from '../../types/lms';
import { DEPARTMENTS, hasEmploymentType } from '../../lib/departments';
import {
  DepartmentChangeRequest,
  departmentLabel,
  loadMyLatestDepartmentRequest,
  requestDepartmentChange,
} from '../../lib/departmentRequests';

export const DepartmentChangeRequestBox: React.FC<{ user: Profile }> = ({ user }) => {
  const [latest, setLatest] = useState<DepartmentChangeRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [dept, setDept] = useState('');
  const [type, setType] = useState<'internal' | 'external' | ''>('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = () =>
    loadMyLatestDepartmentRequest(user.id)
      .then(setLatest)
      .catch(() => undefined);
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const send = async () => {
    if (!dept) return setMessage({ ok: false, text: 'Please choose the new department.' });
    if (hasEmploymentType(dept) && !type) return setMessage({ ok: false, text: 'Please choose Internal or External.' });
    setSending(true);
    setMessage(null);
    try {
      await requestDepartmentChange(dept, hasEmploymentType(dept) ? type : null, reason.trim());
      setMessage({ ok: true, text: 'Request sent. An administrator will review it.' });
      setOpen(false);
      setDept('');
      setType('');
      setReason('');
      await reload();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const input =
    'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#176B98]';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      {latest?.status === 'pending' ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Waiting for admin approval: move to <b>{departmentLabel(latest.to_department, latest.to_employment_type)}</b>.
          </span>
        </p>
      ) : latest?.status === 'rejected' ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          Your request to move to {departmentLabel(latest.to_department, latest.to_employment_type)} was not approved
          {latest.admin_note ? `: ${latest.admin_note}` : '.'}
        </p>
      ) : latest?.status === 'approved' && Date.now() - new Date(latest.resolved_at || 0).getTime() < 14 * 864e5 ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Approved: you are now in {departmentLabel(latest.to_department, latest.to_employment_type)}
          {latest.to_user_code ? ` · new User ID ${latest.to_user_code}` : ''}.
        </p>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B98] dark:text-sky-300 hover:underline cursor-pointer"
        >
          <Building className="w-3.5 h-3.5" />
          {latest?.status === 'pending' ? 'Change my request' : 'Request department change'}
        </button>
      ) : (
        <div className="space-y-2">
          <select
            value={dept}
            onChange={(e) => {
              setDept(e.target.value);
              if (!hasEmploymentType(e.target.value)) setType('');
            }}
            className={input}
          >
            <option value="" disabled>
              New department
            </option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {hasEmploymentType(dept) && (
            <div className="grid grid-cols-2 gap-2">
              {(['internal', 'external'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    type === t
                      ? 'border-[#176B98] bg-[#176B98] text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {t === 'internal' ? 'Internal' : 'External'}
                </button>
              ))}
            </div>
          )}
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className={input} />
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            After approval you get a new User ID for the new department.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send to admin'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && <p className={`text-xs ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  );
};
