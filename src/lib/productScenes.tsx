/**
 * Which picture a product gets (Universal Life → globe, Health → medical,
 * Education → cap and books …) and the clean brand background behind it.
 * The 3D illustrations themselves are in product3d.tsx.
 */
import React from 'react';
import type { ProductKnowledgeItem } from '../types/lms';
import { resolveProductIconKey } from './productVisuals';

export type SceneKey =
  | 'universe'
  | 'family'
  | 'health'
  | 'education'
  | 'savings'
  | 'retirement'
  | 'travel'
  | 'home'
  | 'city'
  | 'shield'
  | 'campaign'
  | 'announce'
  | 'policy'
  | 'notice'
  | 'award'
  | 'celebrate';

export const SCENE_LABELS: Record<SceneKey, string> = {
  universe: 'Universe & Earth',
  family: 'Family sunset',
  health: 'Health & care',
  education: 'Education',
  savings: 'Savings & growth',
  retirement: 'Retirement sunset',
  travel: 'Travel & motor',
  home: 'Home & property',
  city: 'Business city',
  shield: 'Protection',
  campaign: 'Campaign',
  announce: 'Announcement',
  policy: 'Policy & compliance',
  notice: 'Notice',
  award: 'Award & incentive',
  celebrate: 'Celebration',
};

type ProductLike = Pick<ProductKnowledgeItem, 'title' | 'subtitle' | 'category'> & { icon_key?: string | null };

const BY_TEXT: [RegExp, SceneKey][] = [
  [/universal|global|world|cosmo|galax|whole[- ]?life|star/i, 'universe'],
  [/retire|pension|annuit|golden/i, 'retirement'],
  [/educat|student|school|scholar|child|kid|junior|baby/i, 'education'],
  [/health|medical|medi|hospital|critical|illness|cancer|care/i, 'health'],
  [/travel|trip|motor|\bcar\b|vehicle|marine|cargo/i, 'travel'],
  [/home|house|property|fire|agri|farm/i, 'home'],
  [/group|employee|corporate|business|sme|banca|bank|loan/i, 'city'],
  [/endow|saving|wealth|invest|unit[- ]?link|cash|money/i, 'savings'],
  [/family|life|protect/i, 'family'],
];

const BY_ICON: Record<string, SceneKey> = {
  'heart-pulse': 'health', activity: 'health', stethoscope: 'health', hospital: 'health', 'briefcase-medical': 'health', accessibility: 'health',
  'piggy-bank': 'savings', 'trending-up': 'savings', coins: 'savings', 'hand-coins': 'savings', wallet: 'savings',
  sunset: 'retirement', 'calendar-clock': 'family',
  'graduation-cap': 'education', baby: 'education',
  users: 'city', briefcase: 'city', landmark: 'city', building: 'city',
  house: 'home', flame: 'home', sprout: 'home',
  car: 'travel', plane: 'travel', ship: 'travel',
  umbrella: 'family', 'heart-handshake': 'family', 'hand-heart': 'family',
};

/** The scene for a product: from its name first (e.g. "Universal Life" → universe), then its icon. */
export function resolveProductScene(product: ProductLike): SceneKey {
  const text = `${product.title || ''} ${product.subtitle || ''} ${product.category || ''}`;
  const byText = BY_TEXT.find(([re]) => re.test(text))?.[1];
  if (byText && byText !== 'family') return byText;
  return BY_ICON[resolveProductIconKey(product)] || byText || 'shield';
}

/**
 * Clean (not blurred) brand-blue background for the back of a product card,
 * with soft sharp shapes. The product's 3D illustration (product3d.tsx) sits
 * on top of it. Put it as the first child of a `relative overflow-hidden` element.
 */
export const ProductScene: React.FC<{ product: ProductLike; blur?: number; className?: string }> = ({ className = '' }) => (
  <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
    <div className="absolute inset-0 bg-gradient-to-br from-[#1f8ccb] via-[#176b98] to-[#0d3b66]" />
    <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-white/10" />
    <div className="absolute -left-10 -bottom-24 w-56 h-56 rounded-full bg-black/10" />
    <div className="absolute right-8 bottom-10 w-40 h-40 rounded-full bg-sky-300/15" />
  </div>
);
