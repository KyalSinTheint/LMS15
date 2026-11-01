/**
 * Month helpers for Top Performer entries.
 *
 * Older entries were saved with month_index 10 (October) whatever month was
 * typed in "Recognition Period". The period text is what the admin actually
 * chose, so it wins when it names a month.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "March 2026", "Mar 2026", "2026-03", "03/2026" → 3; otherwise null */
export function monthFromPeriod(period?: string | null): number | null {
  const text = (period || '').trim().toLowerCase();
  if (!text) return null;
  const byName = MONTH_NAMES.findIndex((m) =>
    new RegExp(`\\b(${m.toLowerCase()}|${m.slice(0, 3).toLowerCase()}${m === 'September' ? '|sept' : ''})\\b`).test(text)
  );
  if (byName >= 0) return byName + 1;
  const iso = text.match(/\b\d{4}[-/.](\d{1,2})\b/) || text.match(/\b(\d{1,2})[-/.]\d{4}\b/);
  if (iso) {
    const m = Number(iso[1]);
    if (m >= 1 && m <= 12) return m;
  }
  return null;
}

export function yearFromPeriod(period?: string | null): number | null {
  const y = (period || '').match(/\b(20\d{2})\b/);
  return y ? Number(y[1]) : null;
}

/** The month (1–12) a performer belongs to. */
export function performerMonth(p: { recognition_period?: string | null; month_index?: number | null }): number {
  return monthFromPeriod(p.recognition_period) ?? (p.month_index && p.month_index >= 1 && p.month_index <= 12 ? p.month_index : 1);
}
