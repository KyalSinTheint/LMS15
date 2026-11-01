import React from 'react';
import { ArrowRight, Check, Clock, LogIn, MailCheck, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------
// Shared building blocks for the sign-up → admin review → approved flow
// ---------------------------------------------------------------------

const KBZ_LOGO_SRC = '/assets/aistudio/KBZ_Logo_28e9d8fb.png';

/** The KBZ LIFE logo (same artwork as the nav bar) on a white tile, for card headers. */
export const KbzLogoBadge: React.FC = () => (
  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-lg p-1.5">
    <img src={KBZ_LOGO_SRC} alt="KBZ LIFE Insurance" className="w-full h-full object-contain" draggable={false} />
  </div>
);

/** Same brand lockup as the portal nav bar. */
export const AuthBrandHeader: React.FC<{ subtitle?: string }> = () => (
  <div className="w-full max-w-lg text-center mb-6">
    <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/80">
      <img src={KBZ_LOGO_SRC} alt="KBZ LIFE Insurance" className="h-11 w-auto object-contain" />
      <div className="text-left border-l border-slate-200 pl-3">
        <h1 className="text-base font-extrabold text-[#176B98] tracking-tight leading-none">KBZ LIFE Insurance</h1>
        <p className="text-[10px] text-[#737373] font-semibold uppercase tracking-wider mt-0.5">Employee Learning Portal</p>
      </div>
    </div>
  </div>
);

export const AuthPageShell: React.FC<{ subtitle: string; children: React.ReactNode }> = ({ subtitle, children }) => (
  <div className="min-h-screen bg-[#F3F8FB] bg-light-blue-pattern flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
    <AuthBrandHeader subtitle={subtitle} />
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-left">
      {children}
    </div>
  </div>
);

type StepState = 'done' | 'current' | 'upcoming';

interface Step {
  label: string;
  hint: string;
  state: StepState;
}

/** Vertical progress tracker: where the employee is in the approval process. */
export const ApprovalSteps: React.FC<{ steps: Step[] }> = ({ steps }) => (
  <ol className="space-y-0" aria-label="Registration progress">
    {steps.map((step, idx) => {
      const isLast = idx === steps.length - 1;
      return (
        <li key={step.label} className="flex gap-3" aria-current={step.state === 'current' ? 'step' : undefined}>
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                step.state === 'done'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : step.state === 'current'
                  ? 'bg-amber-50 border-amber-400 text-amber-600'
                  : 'bg-white border-slate-200 text-slate-300'
              }`}
            >
              {step.state === 'done' ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : step.state === 'current' ? (
                <Clock className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <span className="text-[11px] font-bold">{idx + 1}</span>
              )}
            </div>
            {!isLast && (
              <div className={`w-0.5 flex-1 min-h-[20px] ${step.state === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
          <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
            <p
              className={`text-sm font-bold leading-7 ${
                step.state === 'upcoming' ? 'text-slate-400' : step.state === 'current' ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {step.label}
              {step.state === 'current' && (
                <span className="ml-2 align-middle px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                  In progress
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">{step.hint}</p>
          </div>
        </li>
      );
    })}
  </ol>
);

// ---------------------------------------------------------------------
// 1. Shown right after "Register" when the employee has no session yet
//    (Supabase email confirmation is on, or the session was not issued).
// ---------------------------------------------------------------------
export const RegistrationSubmittedPage: React.FC<{
  email: string;
  needsEmailConfirmation: boolean;
  onGoToSignIn: () => void;
}> = ({ email, needsEmailConfirmation, onGoToSignIn }) => {
  const steps: Step[] = [
    { label: 'Registration submitted', hint: 'We received your LMS access request.', state: 'done' },
    ...(needsEmailConfirmation
      ? [
          {
            label: 'Confirm your email',
            hint: `Open the confirmation link we sent to ${email}.`,
            state: 'current' as StepState,
          },
        ]
      : []),
    {
      label: 'Administrator review',
      hint: 'An LMS administrator verifies your employee details. This usually takes up to 1 business day.',
      state: needsEmailConfirmation ? 'upcoming' : 'current',
    },
    { label: 'Sign in and start learning', hint: 'Once approved, sign in with your email and password.', state: 'upcoming' },
  ];

  return (
    <AuthPageShell subtitle="Employee Learning Portal · Registration">
      <div className="bg-gradient-to-r from-[#003366] to-[#176B98] text-white p-7">
        <div className="flex items-start gap-4">
          <KbzLogoBadge />
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
              Status: Pending approval
            </span>
            <h2 className="text-2xl font-black mt-1.5 tracking-tight">Request submitted</h2>
            <p className="text-xs text-sky-100/90 mt-1 leading-relaxed">
              {needsEmailConfirmation
                ? 'Please confirm your email address. Your account will then wait for administrator approval.'
                : 'Your account is waiting for administrator approval.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        <ApprovalSteps steps={steps} />

        {needsEmailConfirmation && (
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5">
            <MailCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
            <p className="leading-relaxed">
              Can't find the email? Check your spam folder. The link signs you in and shows your approval status.
            </p>
          </div>
        )}

        <button
          onClick={onGoToSignIn}
          className="w-full py-2.5 px-4 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Go to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[11px] text-slate-500 text-center -mt-3">
          You can sign in any time to check whether your account has been approved.
        </p>
      </div>
    </AuthPageShell>
  );
};

// ---------------------------------------------------------------------
// 2. Shown when a pending employee's account is approved by an admin.
// ---------------------------------------------------------------------
export const AccountApprovedPage: React.FC<{
  fullName: string;
  email: string;
  onSignInAgain: () => void;
}> = ({ fullName, email, onSignInAgain }) => {
  const steps: Step[] = [
    { label: 'Registration submitted', hint: 'We received your LMS access request.', state: 'done' },
    { label: 'Administrator review', hint: 'Your employee details were verified.', state: 'done' },
    { label: 'Sign in and start learning', hint: 'Sign in again to load your learning portal.', state: 'current' },
  ];

  return (
    <AuthPageShell subtitle="Employee Learning Portal · Account Approved">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-7" role="status" aria-live="polite">
        <div className="flex items-start gap-4">
          <KbzLogoBadge />
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
              Status: Approved
            </span>
            <h2 className="text-2xl font-black mt-1.5 tracking-tight">You're approved!</h2>
            <p className="text-xs text-emerald-50 mt-1 leading-relaxed">
              Welcome to the KBZLife Learning Portal, <strong className="text-white">{fullName}</strong>. An administrator
              has approved your account.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        <ApprovalSteps steps={steps} />

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          <p className="leading-relaxed">
            For your security, please <strong>sign in again</strong> as <strong>{email}</strong> to activate your full
            access to courses, training and company updates.
          </p>
        </div>

        <button
          onClick={onSignInAgain}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign in again</span>
        </button>
      </div>
    </AuthPageShell>
  );
};
