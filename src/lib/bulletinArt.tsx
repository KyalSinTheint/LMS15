/**
 * Clean, modern illustrations for Company Bulletin cards (no blur):
 * a deep muted gradient, fine line texture, a faint watermark of the
 * subject and a coloured line icon on a white badge. Original SVG artwork.
 */
import React from 'react';
import {
  Bell, Building2, FileText, GraduationCap, HeartPulse, Megaphone, PartyPopper,
  Plane, ShieldCheck, Target, TrendingUp, Trophy, type LucideIcon,
} from 'lucide-react';
import type { SceneKey } from './productScenes';
import type { Subject } from './bulletinSubjects';
import { SUBJECT_PALETTES } from './bulletinSubjects';

interface Palette {
  from: string;
  to: string;
  accent: string;
}

const PALETTES: Record<string, Palette> = {
  campaign: SUBJECT_PALETTES.fire,
  policy: SUBJECT_PALETTES.royal,
  announce: SUBJECT_PALETTES.ocean,
  notice: SUBJECT_PALETTES.care,
  award: SUBJECT_PALETTES.gold,
  celebrate: SUBJECT_PALETTES.party,
  education: SUBJECT_PALETTES.tech,
  health: SUBJECT_PALETTES.care,
  savings: SUBJECT_PALETTES.fresh,
  city: SUBJECT_PALETTES.night,
  travel: SUBJECT_PALETTES.sky,
  shield: SUBJECT_PALETTES.royal,
};

const SCENE_ICONS: Record<string, LucideIcon> = {
  campaign: Target,
  policy: FileText,
  announce: Megaphone,
  notice: Bell,
  award: Trophy,
  celebrate: PartyPopper,
  education: GraduationCap,
  health: HeartPulse,
  savings: TrendingUp,
  city: Building2,
  travel: Plane,
  shield: ShieldCheck,
};

const sceneKey = (scene: SceneKey) =>
  SCENE_ICONS[scene] ? scene : scene === 'retirement' ? 'savings' : scene === 'home' || scene === 'universe' || scene === 'family' ? 'shield' : 'notice';

let counter = 0;

/** Illustration filling its parent (parent: relative, sized). */
export const BulletinArt: React.FC<{ scene?: SceneKey; subject?: Subject | null; className?: string }> = ({
  scene = 'notice',
  subject,
  className = '',
}) => {
  const key = sceneKey(scene);
  const p = subject ? SUBJECT_PALETTES[subject.palette] : PALETTES[key] || PALETTES.notice;
  const Icon = subject?.Icon || SCENE_ICONS[key];
  const [id] = React.useState(() => `ba${++counter}`);
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 w-full h-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.from} />
          <stop offset="1" stopColor={p.to} />
        </linearGradient>
        <pattern id={`${id}-lines`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="240" fill={`url(#${id}-bg)`} />
      <rect width="400" height="240" fill={`url(#${id}-lines)`} />
      {/* faint watermark of the subject */}
      <Icon x={150} y={-40} width={300} height={300} color="#ffffff" strokeWidth={0.6} opacity={0.12} />
      {/* darker left side keeps the title readable */}
      <rect width="400" height="240" fill={`url(#${id}-fade)`} />
      {/* thin accent rule */}
      <rect x="0" y="236" width="400" height="4" fill={p.accent} opacity="0.55" />

      {/* the subject: coloured line icon on a crisp white badge */}
      <circle cx="300" cy="104" r="72" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" />
      <circle cx="300" cy="108" r="56" fill="#000000" opacity="0.12" />
      <circle cx="300" cy="104" r="56" fill="#ffffff" />
      <Icon x={266} y={70} width={68} height={68} color={p.to} strokeWidth={1.7} />
      {subject?.Accent && (
        <>
          <circle cx="347" cy="62" r="18" fill={p.from} stroke="#ffffff" strokeWidth="3" />
          <subject.Accent x={337} y={52} width={20} height={20} color="#ffffff" strokeWidth={2} />
        </>
      )}
    </svg>
  );
};
