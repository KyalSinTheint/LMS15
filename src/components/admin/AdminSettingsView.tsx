import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Headset,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { getSupabaseClient, getSupabaseConfig, RESET_PASSWORD_PATH } from '../../lib/supabase';
import type { AppSettings } from '../../types/lms';

// ---------------------------------------------------------------------
// Database updates the app relies on: each is checked live against Supabase
// ---------------------------------------------------------------------
const DB_UPDATES: { file: string; label: string; table: string; column: string }[] = [
  { file: '20261102_product_pamphlet_cover.sql', label: 'Product pamphlet covers', table: 'product_knowledge_items', column: 'pamphlet_cover_url' },
  { file: '20261103_product_icon_key.sql', label: 'Product insurance icons', table: 'product_knowledge_items', column: 'icon_key' },
  { file: '20261104_video_parts.sql', label: 'Videos over 50 MB (parts)', table: 'license_training_lessons', column: 'video_parts' },
  { file: '20261105_admin_password_reset.sql', label: 'Admin-approved password reset', table: 'password_reset_requests', column: 'id' },
  { file: '20261106_app_settings.sql', label: 'Saving these settings', table: 'app_settings', column: 'id' },
];

type CheckState = 'checking' | 'ok' | 'missing' | 'error';

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-[#176B98]' : 'bg-slate-300'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
    />
  </button>
);

const SettingRow: React.FC<{ title: string; description: React.ReactNode; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
    <div className="min-w-0">
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <div className="text-[11px] text-slate-500 leading-relaxed mt-1">{description}</div>
    </div>
    {children}
  </div>
);

const Card: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; aside?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  children,
  aside,
}) => (
  <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#176B98] flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {aside}
    </div>
    {children}
  </section>
);

const inputCls =
  'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#176B98]/30 focus:border-[#176B98]';

export const AdminSettingsView: React.FC = () => {
  const { appSettings, appSettingsReady, loadAppSettings, updateAppSettings, isSupabaseLive, refreshData, isLoading, showToast } =
    useLms();

  // ---- Editable settings --------------------------------------------
  const toForm = (s: AppSettings) => ({
    allow_self_registration: s.allow_self_registration,
    require_admin_approval: s.require_admin_approval,
    domains: s.allowed_email_domains.join(', '),
    email_password_reset_enabled: s.email_password_reset_enabled,
    support_email: s.support_email || '',
    support_phone: s.support_phone || '',
  });
  const [form, setForm] = useState(() => toForm(appSettings));
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(toForm(appSettings)), [appSettings]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(toForm(appSettings)), [form, appSettings]);
  const domainList = form.domains
    .split(/[\s,]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  const invalidDomains = domainList.filter((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
  const supportEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.support_email.trim());
  const canSave = isDirty && appSettingsReady && invalidDomains.length === 0 && supportEmailValid && !saving;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    await updateAppSettings({
      allow_self_registration: form.allow_self_registration,
      require_admin_approval: form.require_admin_approval,
      allowed_email_domains: domainList,
      email_password_reset_enabled: form.email_password_reset_enabled,
      support_email: form.support_email,
      support_phone: form.support_phone,
    });
    setSaving(false);
  };

  // ---- System status (read-only, live checks) ------------------------
  const { url: supabaseUrl } = getSupabaseConfig();
  const projectRef = supabaseUrl.replace(/^https:\/\//, '').split('.')[0];
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}`;
  const resetPageUrl = `${window.location.origin}${RESET_PASSWORD_PATH}`;

  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const runChecks = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    setChecks(Object.fromEntries(DB_UPDATES.map((u) => [u.file, 'checking' as CheckState])));
    const results = await Promise.all(
      DB_UPDATES.map(async (u) => {
        const { error } = await client.from(u.table).select(u.column).limit(1);
        if (!error) return [u.file, 'ok'] as const;
        const text = `${error.message} ${error.code || ''}`;
        const missing = /does not exist|could not find|schema cache|42P01|42703|PGRST20[45]/i.test(text);
        return [u.file, missing ? 'missing' : 'error'] as const;
      })
    );
    setChecks(Object.fromEntries(results));
  }, []);
  useEffect(() => {
    runChecks();
  }, [runChecks]);
  const missingCount = Object.values(checks).filter((c) => c === 'missing').length;

  const recheckAll = async () => {
    await Promise.all([runChecks(), loadAppSettings(), refreshData()]);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', 'Copied', text);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#176B98]" />
          <span>Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Every setting here is saved in the database and takes effect for everyone immediately.
        </p>
      </div>

      {!appSettingsReady && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">One-time database update needed to save settings</p>
            <p className="mt-1 leading-relaxed">
              Run <code className="font-mono bg-white/70 px-1 rounded">supabase/migrations/20261106_app_settings.sql</code> in
              Supabase → SQL Editor, then press <strong>Check again</strong> below. Until then the defaults shown here are used.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Sign-up & approval */}
        <Card
          icon={<UserPlus className="w-5 h-5" />}
          title="Sign-up & Account Approval"
          subtitle="Who can create an LMS account, and whether an administrator must approve it."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <SettingRow
              title="Allow employees to register"
              description={
                <>
                  Shows <strong>Register for LMS Access</strong> on the sign-in page. When off, the link is hidden and the
                  database refuses new sign-ups from the LMS.
                </>
              }
            >
              <Toggle
                label="Allow employees to register"
                checked={form.allow_self_registration}
                onChange={(v) => setForm((f) => ({ ...f, allow_self_registration: v }))}
              />
            </SettingRow>
            <SettingRow
              title="Require administrator approval"
              description={
                <>
                  New accounts wait in <strong className="text-amber-700">Pending</strong> until approved in User Management.
                  When off, employees who register can start learning immediately.
                </>
              }
            >
              <Toggle
                label="Require administrator approval"
                checked={form.require_admin_approval}
                onChange={(v) => setForm((f) => ({ ...f, require_admin_approval: v }))}
              />
            </SettingRow>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="allowed-domains">
              Allowed email domains for registration
            </label>
            <input
              id="allowed-domains"
              type="text"
              value={form.domains}
              onChange={(e) => setForm((f) => ({ ...f, domains: e.target.value }))}
              placeholder="e.g. kbzlife.com   (leave empty to allow any email)"
              className={inputCls}
            />
            <p className={`text-[11px] mt-1 ${invalidDomains.length ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
              {invalidDomains.length
                ? `Not a valid domain: ${invalidDomains.join(', ')}`
                : domainList.length
                ? `Only ${domainList.map((d) => '@' + d).join(', ')} addresses can register.`
                : 'Any email address can register. Separate several domains with commas.'}
            </p>
          </div>
        </Card>

        {/* 2. Password reset */}
        <Card
          icon={<KeyRound className="w-5 h-5" />}
          title="Password Reset"
          subtitle="How employees get back into their account when they forget their password."
        >
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Ask the Administrator</strong> is always available on the sign-in page. Requests appear in the{' '}
              <strong>Password Resets</strong> tab, where you approve them and hand over a 24-hour temporary password.
            </p>
          </div>

          <SettingRow
            title="Also offer a reset link by email"
            description={
              <>
                Shows <strong>Send me a reset link by email</strong> in the Forgot password window. Turn this off if
                emails are not being delivered. Emails are sent by Supabase using the SMTP settings below.
              </>
            }
          >
            <Toggle
              label="Offer a reset link by email"
              checked={form.email_password_reset_enabled}
              onChange={(v) => setForm((f) => ({ ...f, email_password_reset_enabled: v }))}
            />
          </SettingRow>

          {form.email_password_reset_enabled && (
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <p className="font-bold text-slate-800">Email sending is configured in Supabase</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`${dashboardUrl}/auth/smtp`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1.5"
                >
                  SMTP settings <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`${dashboardUrl}/auth/url-configuration`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1.5"
                >
                  URL configuration <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`${dashboardUrl}/logs/auth-logs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1.5"
                >
                  Email error logs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <p className="text-slate-600 mb-1">Add this address to Supabase → URL configuration → Redirect URLs:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-700">
                    {resetPageUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(resetPageUrl)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    aria-label="Copy reset page address"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 3. Help desk */}
        <Card
          icon={<Headset className="w-5 h-5" />}
          title="LMS Help Desk Contact"
          subtitle="Shown to employees as “Contact Us” in the footer and on the sign-in page."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="support-email">
                Support email
              </label>
              <input
                id="support-email"
                type="email"
                value={form.support_email}
                onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))}
                className={inputCls}
                required
              />
              {!supportEmailValid && <p className="text-[11px] mt-1 text-red-600 font-semibold">Enter a valid email address.</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="support-phone">
                Support phone <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="support-phone"
                type="tel"
                value={form.support_phone}
                onChange={(e) => setForm((f) => ({ ...f, support_phone: e.target.value }))}
                placeholder="e.g. 09 xxx xxx xxx"
                className={inputCls}
              />
            </div>
          </div>
        </Card>

        {/* Save bar */}
        <div className="sticky bottom-3 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 pl-4 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg">
          <p className="text-[11px] text-slate-500">
            {isDirty ? (
              <span className="font-semibold text-amber-700">You have unsaved changes.</span>
            ) : appSettings.updated_at && appSettings.updated_by_name ? (
              <>
                Last saved by <strong className="text-slate-700">{appSettings.updated_by_name}</strong> on{' '}
                {new Date(appSettings.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </>
            ) : (
              'All settings are saved.'
            )}
          </p>
          <div className="flex gap-2 justify-end">
            {isDirty && (
              <button
                type="button"
                onClick={() => setForm(toForm(appSettings))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Discard
              </button>
            )}
            <button
              type="submit"
              disabled={!canSave}
              className="px-5 py-2 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving…' : 'Save settings'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 4. System status (read-only) */}
      <Card
        icon={<Database className="w-5 h-5" />}
        title="System Status"
        subtitle="Live checks of the Supabase database this portal uses."
        aside={
          <button
            type="button"
            onClick={recheckAll}
            disabled={isLoading}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Check again
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
            <p className="font-bold text-slate-800">Database connection</p>
            <p className={`mt-1 flex items-center gap-1.5 font-semibold ${isSupabaseLive ? 'text-emerald-700' : 'text-amber-700'}`}>
              <span className={`w-2 h-2 rounded-full ${isSupabaseLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isSupabaseLive ? 'Connected' : 'Some data could not be loaded'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 min-w-0">
            <p className="font-bold text-slate-800">Supabase project</p>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#176B98] hover:underline break-all"
            >
              {projectRef} <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-800">Database updates</p>
            <span className={`text-[11px] font-semibold ${missingCount ? 'text-amber-700' : 'text-emerald-700'}`}>
              {missingCount ? `${missingCount} to run in Supabase → SQL Editor` : 'All installed'}
            </span>
          </div>
          <ul className="rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
            {DB_UPDATES.map((u) => {
              const state = checks[u.file] || 'checking';
              return (
                <li key={u.file} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{u.label}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate">supabase/migrations/{u.file}</p>
                  </div>
                  {state === 'checking' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" aria-label="Checking" />
                  ) : state === 'ok' ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Installed
                    </span>
                  ) : state === 'missing' ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-amber-700 font-bold">
                      <AlertTriangle className="w-4 h-4" /> Run this file
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 text-slate-500 font-bold">
                      <XCircle className="w-4 h-4" /> Could not check
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </div>
  );
};
