/**
 * Time limit for quiz retakes: from the second attempt on, a learner has
 * 5 minutes for the 10 questions. When the time is up the quiz closes and the
 * answers given so far are submitted (unanswered questions count as wrong).
 *
 * The deadline is kept in sessionStorage, so closing and reopening the quiz
 * does not restart the clock.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AlarmClock, Timer } from 'lucide-react';

export const RETAKE_LIMIT_SECONDS = 5 * 60;

const read = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* storage unavailable: the timer still runs for this view */
  }
};
const remove = (k: string) => {
  try {
    sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
};

/**
 * Seconds left while `active` (null when there is no time limit).
 * `done` clears the saved deadline once the attempt has been graded.
 */
export function useRetakeTimer({
  active,
  done,
  storageKey,
  onExpire,
}: {
  active: boolean;
  done: boolean;
  storageKey: string;
  onExpire: () => void;
}): number | null {
  const [left, setLeft] = useState<number | null>(null);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (done && storageKey) remove(storageKey);
  }, [done, storageKey]);

  useEffect(() => {
    if (!active || !storageKey) {
      setLeft(null);
      return;
    }
    let end = Number(read(storageKey));
    if (!end || end - Date.now() > RETAKE_LIMIT_SECONDS * 1000 + 5000) {
      end = Date.now() + RETAKE_LIMIT_SECONDS * 1000;
      write(storageKey, String(end));
    }
    let fired = false;
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        expire.current();
      }
    };
    const id = window.setInterval(tick, 500);
    tick();
    return () => window.clearInterval(id);
  }, [active, storageKey]);

  return left;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Countdown shown above the questions during a retake. */
export const QuizTimerBadge: React.FC<{ seconds: number }> = ({ seconds }) => {
  const urgent = seconds <= 60;
  return (
    <span
      role="timer"
      aria-live={urgent ? 'polite' : 'off'}
      title="Retake time limit: 5 minutes"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tabular-nums border ${
        urgent
          ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 animate-pulse'
          : 'bg-sky-50 text-[#176B98] border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
      }`}
    >
      <Timer className="w-3.5 h-3.5" />
      {mmss(seconds)}
    </span>
  );
};

/** Short note at the top of the result when the time ran out. */
export const TimeUpNotice: React.FC = () => (
  <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
    <AlarmClock className="w-4 h-4 shrink-0" />
    <span>Time's up! The 5-minute retake limit ended, so your answers were submitted automatically.</span>
  </div>
);

/** Shown before the first question of a retake. */
export const RetakeTimeHint: React.FC = () => (
  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
    Retake: you have 5 minutes for these questions. The quiz closes when the time runs out.
  </p>
);
