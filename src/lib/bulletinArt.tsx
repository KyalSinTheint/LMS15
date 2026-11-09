/**
 * Modern, sharp illustrations for Company Bulletin cards (no blur):
 * a two-colour gradient, soft shapes, a dotted pattern and a glossy
 * "3D" icon on a glass panel. Original SVG artwork; one per topic.
 */
import React from 'react';
import type { SceneKey } from './productScenes';

interface Palette {
  from: string;
  to: string;
  accent: string;
}

const PALETTES: Record<string, Palette> = {
  campaign: { from: '#ff7a18', to: '#af002d', accent: '#ffd166' },
  policy: { from: '#3a1c71', to: '#176B98', accent: '#7ee8fa' },
  announce: { from: '#0061ff', to: '#60efff', accent: '#ffe066' },
  notice: { from: '#0f9b8e', to: '#43cea2', accent: '#ffd166' },
  award: { from: '#f7971e', to: '#c2410c', accent: '#fff3b0' },
  celebrate: { from: '#ee0979', to: '#7f00ff', accent: '#ffe66d' },
  education: { from: '#4776e6', to: '#8e54e9', accent: '#ffd166' },
  health: { from: '#00b09b', to: '#0f766e', accent: '#ff6b81' },
  savings: { from: '#11998e', to: '#38ef7d', accent: '#ffd166' },
  city: { from: '#0f2027', to: '#2c5364', accent: '#7ee8fa' },
  travel: { from: '#2193b0', to: '#6dd5ed', accent: '#ffd166' },
  shield: { from: '#0b2a4a', to: '#176B98', accent: '#7ee8fa' },
};

/** The glossy subject drawn in the middle of the glass panel (centred on 0,0, about 120×120). */
const ICONS: Record<string, (p: Palette, id: string) => React.ReactElement> = {
  campaign: (p, id) => (
    <g>
      <circle r="58" fill="#fff" />
      <circle r="44" fill={`url(#${id}-main)`} />
      <circle r="30" fill="#fff" />
      <circle r="16" fill={`url(#${id}-main)`} />
      <line x1="0" y1="0" x2="54" y2="-54" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
      <path d="M54 -54 l20 -4 l-6 18z M54 -54 l4 -20 l12 8z" fill={p.accent} />
      <circle r="5" fill="#1f2937" />
    </g>
  ),
  policy: (p, id) => (
    <g>
      <rect x="-46" y="-58" width="78" height="104" rx="12" fill="#fff" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="-34" y={-40 + i * 16} width={i === 0 ? 40 : 54 - (i % 2) * 14} height="7" rx="3.5" fill={i === 0 ? p.to : '#cbd5e1'} />
      ))}
      <path d="M30 -6 L62 6 V32 C62 52 48 64 30 72 C12 64 -2 52 -2 32 V6z" fill={`url(#${id}-main)`} stroke="#fff" strokeWidth="4" />
      <path d="M17 32 l10 10 l20 -22" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  announce: (p, id) => (
    <g transform="translate(-6 0)">
      <path d="M-44 -16 L38 -52 V52 L-44 16z" fill="#fff" />
      <rect x="-62" y="-20" width="26" height="40" rx="9" fill={`url(#${id}-main)`} />
      <rect x="32" y="-56" width="14" height="112" rx="7" fill={`url(#${id}-main)`} />
      <path d="M-36 16 l12 38 h18 l-10 -32z" fill="#e2e8f0" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${58 + i * 12} ${-22 - i * 8} q${14 + i * 4} ${22 + i * 8} 0 ${44 + i * 16}`} fill="none" stroke={p.accent} strokeWidth="5" strokeLinecap="round" />
      ))}
    </g>
  ),
  notice: (p, id) => (
    <g>
      <path d="M0 -58 c-34 0 -50 26 -50 56 v26 l-16 22 h132 l-16 -22 v-26 c0 -30 -16 -56 -50 -56z" fill="#fff" />
      <path d="M0 -40 c-22 0 -32 18 -32 38 v24 h64 v-24 c0 -20 -10 -38 -32 -38z" fill={`url(#${id}-main)`} opacity="0.25" />
      <circle cy="58" r="13" fill={`url(#${id}-main)`} />
      <circle cx="44" cy="-44" r="20" fill="#ef4444" stroke="#fff" strokeWidth="4" />
      <rect x="41" y="-55" width="6" height="14" rx="3" fill="#fff" />
      <circle cx="44" cy="-34" r="3.5" fill="#fff" />
    </g>
  ),
  award: (p, id) => (
    <g>
      <path d="M-40 -58 h80 v32 c0 34 -18 54 -40 58 c-22 -4 -40 -24 -40 -58z" fill={`url(#${id}-main)`} stroke="#fff" strokeWidth="4" />
      <path d="M-40 -46 h-20 c0 28 12 40 26 42 M40 -46 h20 c0 28 -12 40 -26 42" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <rect x="-9" y="32" width="18" height="22" fill="#fff" />
      <rect x="-30" y="52" width="60" height="14" rx="4" fill="#fff" />
      <path d="M0 -40 l6 13 l14 2 l-10 10 l3 14 l-13 -7 l-13 7 l3 -14 l-10 -10 l14 -2z" fill="#fff" />
    </g>
  ),
  celebrate: (p, id) => (
    <g>
      <path d="M-56 58 L-20 -40 L40 20z" fill={`url(#${id}-main)`} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <path d="M-44 26 L8 46 M-34 -2 L26 22" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      {[
        [10, -50, p.accent],
        [44, -34, '#fff'],
        [58, -6, p.accent],
        [28, -62, '#fff'],
      ].map(([x, y, c], i) => (
        <circle key={i} cx={Number(x)} cy={Number(y)} r={i % 2 ? 5 : 8} fill={String(c)} />
      ))}
      <path d="M-4 -30 q18 -26 44 -18 M8 0 q30 -10 48 14" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  education: (p, id) => (
    <g>
      <path d="M0 52 C-22 40 -48 40 -66 48 V-14 C-48 -22 -22 -22 0 -8z" fill="#fff" />
      <path d="M0 52 C22 40 48 40 66 48 V-14 C48 -22 22 -22 0 -8z" fill="#e2e8f0" />
      <path d="M-46 -40 L0 -60 L46 -40 L0 -20z" fill={`url(#${id}-main)`} stroke="#fff" strokeWidth="3" />
      <path d="M-28 -32 v14 q28 12 56 0 v-14 l-28 12z" fill={`url(#${id}-main)`} />
      <line x1="44" y1="-40" x2="44" y2="-18" stroke={p.accent} strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="-14" r="5" fill={p.accent} />
    </g>
  ),
  health: (p, id) => (
    <g>
      <path d="M0 58 C-70 14 -64 -50 -24 -54 C-10 -55 -2 -46 0 -40 C2 -46 10 -55 24 -54 C64 -50 70 14 0 58z" fill="#fff" />
      <rect x="-11" y="-30" width="22" height="58" rx="5" fill={`url(#${id}-main)`} />
      <rect x="-29" y="-12" width="58" height="22" rx="5" fill={`url(#${id}-main)`} />
      <polyline points="-70,30 -40,30 -30,10 -18,48 -6,30 70,30" fill="none" stroke={p.accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  savings: (p, id) => (
    <g>
      {[0, 1, 2].map((col) =>
        Array.from({ length: 2 + col * 2 }, (_, k) => (
          <ellipse key={`${col}-${k}`} cx={-40 + col * 36} cy={52 - k * 11} rx="17" ry="6.5" fill="#ffd166" stroke="#b45309" strokeWidth="1.5" />
        ))
      )}
      <polyline points="-62,0 -30,-22 -6,-12 30,-48 56,-58" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 -58 l-20 2 l12 14z" fill="#fff" />
      <circle cx="-62" cy="0" r="6" fill={`url(#${id}-main)`} stroke="#fff" strokeWidth="3" />
    </g>
  ),
  city: (p, id) => (
    <g>
      {[
        [-62, -10, 28],
        [-30, -50, 34],
        [8, -26, 28],
        [40, -62, 30],
      ].map(([x, top, w], i) => (
        <g key={i}>
          <rect x={x} y={top} width={w} height={62 - top} rx="4" fill={i % 2 ? '#fff' : '#e2e8f0'} />
          {Array.from({ length: Math.floor((56 - top) / 14) }, (_, r) =>
            [0, 1].map((c) => <rect key={`${r}-${c}`} x={x + 6 + c * (w / 2 - 2)} y={top + 8 + r * 14} width={w / 2 - 10} height="6" rx="2" fill={`url(#${id}-main)`} />)
          )}
        </g>
      ))}
    </g>
  ),
  travel: (p, id) => (
    <g transform="rotate(-20)">
      <path d="M-70 0 L64 -6 Q80 0 64 6z" fill="#fff" />
      <path d="M-4 -2 L-30 -54 L-14 -54 L26 -4z" fill={`url(#${id}-main)`} />
      <path d="M-4 2 L-30 54 L-14 54 L26 4z" fill={`url(#${id}-main)`} />
      <path d="M-60 -2 L-74 -24 L-64 -24 L-46 -2z" fill="#fff" />
    </g>
  ),
  shield: (p, id) => (
    <g>
      <path d="M0 -62 L52 -42 V2 C52 38 30 58 0 70 C-30 58 -52 38 -52 2 V-42z" fill={`url(#${id}-main)`} stroke="#fff" strokeWidth="5" />
      <path d="M-22 4 l16 16 l30 -34" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
};

const iconKey = (scene: SceneKey) => (ICONS[scene] ? scene : scene === 'home' || scene === 'universe' || scene === 'family' ? 'shield' : scene === 'retirement' ? 'savings' : 'notice');

let counter = 0;

/** Sharp modern illustration filling its parent (parent: relative, sized). */
export const BulletinArt: React.FC<{ scene: SceneKey; className?: string }> = ({ scene, className = '' }) => {
  const key = iconKey(scene);
  const p = PALETTES[key] || PALETTES.notice;
  const [id] = React.useState(() => `ba${++counter}`);
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 w-full h-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.from} />
          <stop offset="1" stopColor={p.to} />
        </linearGradient>
        <linearGradient id={`${id}-main`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.from} />
          <stop offset="1" stopColor={p.to} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
        <pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="#ffffff" opacity="0.22" />
        </pattern>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect width="400" height="240" fill={`url(#${id}-bg)`} />
      {/* soft shapes */}
      <circle cx="350" cy="10" r="120" fill="#ffffff" opacity="0.10" />
      <circle cx="30" cy="250" r="110" fill="#000000" opacity="0.10" />
      <circle cx="60" cy="40" r="46" fill={p.accent} opacity="0.20" />
      <rect x="0" y="0" width="190" height="240" fill={`url(#${id}-dots)`} />
      {/* rings */}
      <circle cx="300" cy="120" r="96" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
      <circle cx="300" cy="120" r="118" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="2" strokeDasharray="4 8" />
      {/* sparkles */}
      {[
        [110, 52, 7],
        [178, 196, 5],
        [380, 200, 6],
        [216, 34, 4],
      ].map(([x, y, s], i) => (
        <path key={i} d={`M${x} ${y - s * 2} Q${x} ${y} ${x + s * 2} ${y} Q${x} ${y} ${x} ${y + s * 2} Q${x} ${y} ${x - s * 2} ${y} Q${x} ${y} ${x} ${y - s * 2}z`} fill="#ffffff" opacity="0.8" />
      ))}

      {/* glass panel with the subject */}
      <g filter={`url(#${id}-shadow)`}>
        <rect x="216" y="38" width="168" height="164" rx="34" fill={`url(#${id}-glass)`} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.5" />
      </g>
      <g transform="translate(300 122) scale(0.98)" filter={`url(#${id}-shadow)`}>
        {ICONS[key](p, id)}
      </g>
    </svg>
  );
};
