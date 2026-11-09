/**
 * Picture for a Company Bulletin item, chosen from its title, description,
 * tags and category (e.g. "Q4 Sales Campaign" → campaign target and
 * confetti, "Compliance memo" → policy document and shield).
 */
import type { CompanyBulletinItem } from '../types/lms';
import type { SceneKey } from './productScenes';

const RULES: [RegExp, SceneKey][] = [
  [/award|winner|top performer|champion|reward|incentive|bonus|prize|recogni|congrat|ဆု/i, 'award'],
  [/campaign|contest|competition|challenge|target|sales drive|promotion|kpi|ပြိုင်ပွဲ|ကမ်ပိန်း/i, 'campaign'],
  [/holiday|festival|thingyan|new year|celebrat|anniversary|party|christmas|diwali|eid|ပွဲတော်|နှစ်သစ်|သင်္ကြန်/i, 'celebrate'],
  [/policy|memo|compliance|regulat|guideline|sop|procedure|circular|directive|rule|ifrs|aml|kyc|audit|မူဝါဒ|စည်းကမ်း|ညွှန်ကြား/i, 'policy'],
  [/training|course|exam|license|learning|workshop|seminar|webinar|သင်တန်း|စာမေးပွဲ/i, 'education'],
  [/health|medical|hospital|covid|wellness|vaccine|ကျန်းမာ/i, 'health'],
  [/claim|payout|premium|saving|finance|payment|budget|investment/i, 'savings'],
  [/\b(office|branch|system|it|digital|app|portal|maintenance|relocat\w*|opening|software|network|email|password)\b/i, 'city'],
  [/insurance|policyholder|coverage|protect|life plan|product|အာမခံ/i, 'shield'],
  [/travel|trip|transport/i, 'travel'],
  [/launch|announce|introduc|welcome|new product|ကြေညာ/i, 'announce'],
  [/notice|reminder|deadline|urgent|alert|attention|update|အသိပေး/i, 'notice'],
];

const BY_CATEGORY: Record<string, SceneKey> = {
  Campaign: 'campaign',
  Announcement: 'announce',
  Notice: 'notice',
  'Policy Memo': 'policy',
  Incentive: 'award',
};

/** Pictures an admin can choose for a bulletin (stored in company_bulletins.color_theme). */
export const BULLETIN_ART_OPTIONS: { key: SceneKey; label: string }[] = [
  { key: 'campaign', label: 'Campaign / target' },
  { key: 'policy', label: 'Policy / compliance' },
  { key: 'announce', label: 'Announcement' },
  { key: 'notice', label: 'Notice / reminder' },
  { key: 'award', label: 'Award / incentive' },
  { key: 'celebrate', label: 'Celebration / holiday' },
  { key: 'education', label: 'Training / exam' },
  { key: 'health', label: 'Health' },
  { key: 'savings', label: 'Finance / savings' },
  { key: 'city', label: 'Office / IT / branch' },
  { key: 'travel', label: 'Travel' },
  { key: 'shield', label: 'Protection / insurance' },
];
const ART_KEYS = new Set(BULLETIN_ART_OPTIONS.map((o) => o.key as string));

/** The admin's chosen picture, or one picked automatically from the text. */
export function resolveBulletinScene(
  b: Pick<CompanyBulletinItem, 'title' | 'description' | 'category' | 'tags'> & { color_theme?: string | null }
): SceneKey {
  if (b.color_theme && ART_KEYS.has(b.color_theme)) return b.color_theme as SceneKey;
  return autoBulletinScene(b);
}

export function autoBulletinScene(b: Pick<CompanyBulletinItem, 'title' | 'description' | 'category' | 'tags'>): SceneKey {
  const head = `${b.title || ''} ${(b.tags || []).join(' ')}`;
  const byTitle = RULES.find(([re]) => re.test(head))?.[1];
  if (byTitle) return byTitle;
  if (BY_CATEGORY[b.category]) return BY_CATEGORY[b.category];
  return RULES.find(([re]) => re.test(b.description || ''))?.[1] || 'notice';
}
