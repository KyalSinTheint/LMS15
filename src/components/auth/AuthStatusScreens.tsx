import React, { useState } from 'react';
import { AlertCircle, Database, KeyRound, Loader2, LogOut } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { validatePassword } from '../../lib/passwordValidation';
import { PasswordRequirementsDisplay } from '../common/PasswordRequirementsDisplay';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#EDF4FB] bg-light-blue-pattern flex flex-col justify-center items-center p-4 sm:p-6 font-sans antialiased">
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-5">{children}</div>
  </div>
);

/** Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. */
export const SupabaseSetupRequired: React.FC = () => (
  <Shell>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
        <Database className="w-5 h-5" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-slate-900">Database not configured</h1>
        <p className="text-xs text-slate-500">KBZLife LMS stores all data in Supabase.</p>
      </div>
    </div>
    <ol className="text-sm text-slate-700 space-y-2 list-decimal pl-5">
      <li>
        Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> from your Supabase project's API settings.
      </li>
      <li>
        Run every SQL file in <code>supabase/migrations</code> (in order), then optionally{' '}
        <code>supabase/seed.sql</code> for demo content.
      </li>
      <li>Restart the dev server.</li>
    </ol>
  </Shell>
);

export const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#EDF4FB] flex items-center justify-center font-sans">
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <Loader2 className="w-5 h-5 animate-spin text-[#176B98]" />
      <span>Connecting to KBZLife LMS…</span>
    </div>
  </div>
);

/** Shown after the user follows a password-reset email link. */
export const ResetPasswordPage: React.FC = () => {
  const { completePasswordRecovery, signOut, exitPasswordRecovery, isAuthenticated } = useLms();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.firstErrorMessage);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    const res = await completePasswordRecovery(password);
    setSaving(false);
    if (!res.success) setError(res.message);
  };

  // Opened /reset-password without a valid recovery session: the link expired or was already used
  if (!isAuthenticated) {
    const description =
      new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description') ||
      'This password reset link has expired or has already been used.';
    return (
      <Shell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Reset link no longer valid</h1>
            <p className="text-xs text-slate-500">{description.replace(/\+/g, ' ')}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Go back to sign in and choose <strong>Forgot password?</strong> to receive a new link. Each link works once and
          expires after a short time.
        </p>
        <button
          type="button"
          onClick={exitPasswordRecovery}
          className="w-full py-2.5 rounded-xl bg-[#003366] hover:bg-[#00529B] text-white text-sm font-bold transition-colors cursor-pointer"
        >
          Back to sign in
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F3F8FB] text-[#176B98] flex items-center justify-center border border-[#176B98]/20">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Set a new password</h1>
          <p className="text-xs text-slate-500">Choose a new password for your KBZLife LMS account.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">New password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B98]/40"
          />
          <PasswordRequirementsDisplay password={password} showAlways={false} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B98]/40"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-[#003366] hover:bg-[#00529B] text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save new password'}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cancel and sign out
        </button>
      </form>
    </Shell>
  );
};
