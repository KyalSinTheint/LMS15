/**
 * Product card colours and insurance icons.
 *
 * - Amber and Rose were retired from the product colour palette; products
 *   saved with them (or any unknown value) are shown in KBZ brand navy.
 * - Instead of an uploaded product image, admins pick an insurance icon.
 *   Products without a chosen icon get one inferred from their name/category.
 */
import React from 'react';
import {
  Accessibility,
  Activity,
  Baby,
  Briefcase,
  BriefcaseMedical,
  Building2,
  CalendarClock,
  Car,
  Coins,
  Flame,
  GraduationCap,
  HandCoins,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  Hospital,
  House,
  Landmark,
  LucideIcon,
  PiggyBank,
  Plane,
  Shield,
  ShieldCheck,
  ShieldPlus,
  Ship,
  Sprout,
  Stethoscope,
  Sunset,
  TrendingUp,
  Umbrella,
  Users,
  Wallet,
} from 'lucide-react';
import type { ProductColorTheme, ProductKnowledgeItem } from '../types/lms';

// ---------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------
export const PRODUCT_COLOR_THEMES: ProductColorTheme[] = ['navy', 'emerald', 'indigo', 'teal', 'sky', 'slate'];

export function normalizeProductTheme(theme?: string | null): ProductColorTheme {
  return PRODUCT_COLOR_THEMES.includes(theme as ProductColorTheme) ? (theme as ProductColorTheme) : 'navy';
}

// ---------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------
export interface ProductIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export const PRODUCT_ICONS: ProductIconOption[] = [
  { key: 'shield', label: 'Protection', Icon: Shield },
  { key: 'shield-check', label: 'Guaranteed Cover', Icon: ShieldCheck },
  { key: 'shield-plus', label: 'Comprehensive Cover', Icon: ShieldPlus },
  { key: 'umbrella', label: 'Life Cover', Icon: Umbrella },
  { key: 'heart-handshake', label: 'Family Care', Icon: HeartHandshake },
  { key: 'hand-heart', label: 'Life Protection', Icon: HandHeart },
  { key: 'heart-pulse', label: 'Health', Icon: HeartPulse },
  { key: 'activity', label: 'Critical Illness', Icon: Activity },
  { key: 'stethoscope', label: 'Medical', Icon: Stethoscope },
  { key: 'hospital', label: 'Hospital Cash', Icon: Hospital },
  { key: 'briefcase-medical', label: 'Medical Expense', Icon: BriefcaseMedical },
  { key: 'accessibility', label: 'Disability', Icon: Accessibility },
  { key: 'piggy-bank', label: 'Savings / Endowment', Icon: PiggyBank },
  { key: 'trending-up', label: 'Investment-linked', Icon: TrendingUp },
  { key: 'coins', label: 'Cash Value', Icon: Coins },
  { key: 'hand-coins', label: 'Payout / Annuity', Icon: HandCoins },
  { key: 'wallet', label: 'Premium Plans', Icon: Wallet },
  { key: 'sunset', label: 'Retirement', Icon: Sunset },
  { key: 'calendar-clock', label: 'Term Plan', Icon: CalendarClock },
  { key: 'graduation-cap', label: 'Education', Icon: GraduationCap },
  { key: 'baby', label: 'Child Plan', Icon: Baby },
  { key: 'users', label: 'Group / Family', Icon: Users },
  { key: 'briefcase', label: 'Corporate / Employee', Icon: Briefcase },
  { key: 'landmark', label: 'Bancassurance', Icon: Landmark },
  { key: 'building', label: 'Business / Property', Icon: Building2 },
  { key: 'house', label: 'Home', Icon: House },
  { key: 'car', label: 'Motor', Icon: Car },
  { key: 'plane', label: 'Travel', Icon: Plane },
  { key: 'ship', label: 'Marine', Icon: Ship },
  { key: 'flame', label: 'Fire', Icon: Flame },
  { key: 'sprout', label: 'Agriculture', Icon: Sprout },
];

const ICONS_BY_KEY = new Map(PRODUCT_ICONS.map((o) => [o.key, o]));

// First matching rule wins (checked against title, subtitle and category)
const KEYWORD_RULES: [RegExp, string][] = [
  [/group|employee|staff/i, 'users'],
  [/loan|credit|mortgage/i, 'landmark'],
  [/critical|cancer|illness/i, 'activity'],
  [/hospital/i, 'hospital'],
  [/health|medical|medi/i, 'heart-pulse'],
  [/disab|accident|tpd/i, 'accessibility'],
  [/educat|student|school|scholar/i, 'graduation-cap'],
  [/\b(child|children|kids?|junior|baby)\b/i, 'baby'],
  [/retire|pension|annuit/i, 'sunset'],
  [/endow|saving|wealth/i, 'piggy-bank'],
  [/invest|unit[- ]?link/i, 'trending-up'],
  [/family/i, 'heart-handshake'],
  [/corporate|business|sme|keyman/i, 'briefcase'],
  [/banca|bank/i, 'landmark'],
  [/\b(motor|cars?|vehicles?)\b/i, 'car'],
  [/travel|trip|overseas/i, 'plane'],
  [/\b(marine|cargo|ship)\b/i, 'ship'],
  [/\bfire\b/i, 'flame'],
  [/\b(property|home|house)\b/i, 'house'],
  [/agri|farm|crop|livestock/i, 'sprout'],
  [/\bterm\b/i, 'calendar-clock'],
  [/life/i, 'umbrella'],
];

/** The icon key to show for a product: the admin's choice, or one inferred from its name. */
export function resolveProductIconKey(product: Pick<ProductKnowledgeItem, 'title' | 'subtitle' | 'category'> & { icon_key?: string | null }): string {
  if (product.icon_key && ICONS_BY_KEY.has(product.icon_key)) return product.icon_key;
  const text = `${product.title || ''} ${product.subtitle || ''} ${product.category || ''}`;
  return KEYWORD_RULES.find(([re]) => re.test(text))?.[1] ?? 'shield';
}

export function getProductIconOption(key?: string | null): ProductIconOption {
  return (key && ICONS_BY_KEY.get(key)) || ICONS_BY_KEY.get('shield')!;
}

/** Renders a product's insurance icon. */
export const ProductIcon: React.FC<{
  product: Pick<ProductKnowledgeItem, 'title' | 'subtitle' | 'category'> & { icon_key?: string | null };
  className?: string;
  strokeWidth?: number;
}> = ({ product, className, strokeWidth = 1.75 }) => {
  const { Icon, label } = getProductIconOption(resolveProductIconKey(product));
  return <Icon className={className} strokeWidth={strokeWidth} aria-label={label} role="img" />;
};
