/**
 * Glossy "3D clay" illustrations for products (Health → clipboard, cross and
 * pills; Universal Life → globe with an orbit; Education → cap on books …).
 * Original SVG artwork: every shape has a darker side for depth, a gradient
 * face and a soft highlight, so it looks like a rendered 3D icon while staying
 * sharp at any size.
 */
import React from 'react';
import type { SceneKey } from './productScenes';
import { resolveProductScene } from './productScenes';
import type { ProductKnowledgeItem } from '../types/lms';

type M = 'blue' | 'light' | 'orange' | 'coral' | 'cream' | 'gold' | 'green' | 'navy' | 'grey';
const MAT: Record<M, { top: string; bottom: string; side: string }> = {
  blue: { top: '#74bdf2', bottom: '#2c7cc4', side: '#1d5e98' },
  light: { top: '#c3e6fb', bottom: '#72b6e8', side: '#4b8fc4' },
  orange: { top: '#ffcf8a', bottom: '#f39436', side: '#c46a1a' },
  coral: { top: '#ffa085', bottom: '#ec5a3f', side: '#b53c27' },
  cream: { top: '#ffffff', bottom: '#e8e3da', side: '#c4bcae' },
  gold: { top: '#ffe797', bottom: '#f4b63a', side: '#c68714' },
  green: { top: '#a5e8b9', bottom: '#43b36f', side: '#2b8a4f' },
  navy: { top: '#5f80b0', bottom: '#24406b', side: '#152a49' },
  grey: { top: '#e4e9ef', bottom: '#aab6c4', side: '#8592a3' },
};

// ---- path helpers ------------------------------------------------------------
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
const el = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
const plus = (cx: number, cy: number, a: number, t: number) => {
  const h = a / 2;
  const s = t / 2;
  return `M${cx - s} ${cy - h}H${cx + s}V${cy - s}H${cx + h}V${cy + s}H${cx + s}V${cy + h}H${cx - s}V${cy + s}H${cx - h}V${cy - s}H${cx - s}z`;
};
const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.48 : r;
    return `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join('') + 'z';
const HEART = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + 26 * s}C${cx - 28 * s} ${cy + 8 * s} ${cx - 36 * s} ${cy - 10 * s} ${cx - 28 * s} ${cy - 22 * s}C${cx - 20 * s} ${cy - 34 * s} ${cx - 4 * s} ${cy - 32 * s} ${cx} ${cy - 20 * s}C${cx + 4 * s} ${cy - 32 * s} ${cx + 20 * s} ${cy - 34 * s} ${cx + 28 * s} ${cy - 22 * s}C${cx + 36 * s} ${cy - 10 * s} ${cx + 28 * s} ${cy + 8 * s} ${cx} ${cy + 26 * s}z`;

type Draw = {
  /** a solid clay shape: darker side, gradient face, highlight */
  C: (d: string, m: M, depth?: number, round?: number) => React.ReactElement;
  /** a clay "tube" (stroke) */
  S: (d: string, m: M, w: number, depth?: number) => React.ReactElement;
  id: string;
};

let k = 0;
const key = () => `p3k${++k}`;

const SCENES: Record<string, (g: Draw) => React.ReactNode> = {
  health: ({ C }) => (
    <>
      {C(rr(58, 40, 116, 162, 18), 'blue', 8)}
      {C(rr(72, 58, 88, 128, 10), 'cream', 3)}
      {[62, 50, 40].map((w, i) => (
        <path key={i} d={rr(84, 80 + i * 18, w, 8, 4)} fill="#b5bfcc" />
      ))}
      {C(rr(94, 28, 52, 26, 12), 'light', 6)}
      <path d={el(120, 37, 4)} fill="#2c7cc4" />
      {C(plus(172, 132, 74, 28), 'coral', 9, 10)}
      <g transform="rotate(-35 104 182)">
        {C(rr(68, 167, 72, 30, 15), 'cream', 6)}
        {C(rr(68, 167, 38, 30, 15), 'blue', 6)}
      </g>
      {C(el(64, 202, 17, 15), 'orange', 6)}
      <path d="M52 202h24" stroke="#c46a1a" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  universe: ({ C, S, id }) => (
    <>
      <g transform="rotate(-18 120 118)">{S(`M36 118a84 26 0 1 0 168 0a84 26 0 1 0 -168 0`, 'orange', 9, 5)}</g>
      {C(el(120, 116, 62), 'blue', 6)}
      <clipPath id={`${id}-globe`}>
        <path d={el(120, 116, 62)} />
      </clipPath>
      <g clipPath={`url(#${id}-globe)`}>
        {C('M84 76c14-12 36-10 42 4 6 12-8 18-4 30 3 10-10 16-20 10-10-6-8-18-18-22-10-4-8-16 0-22z', 'green', 0)}
        {C('M140 116c10-4 26 2 28 16 2 12-8 26-20 28-10 2-16-8-12-16 3-7-6-22 4-28z', 'green', 0)}
        {C('M96 148c8-2 18 4 16 12-2 7-14 8-18 2-3-5-2-12 2-14z', 'green', 0)}
      </g>
      <g transform="rotate(-18 120 118)">{S(`M36 118A84 26 0 0 0 204 118`, 'orange', 9, 5)}</g>
      {C(star(190, 50, 16), 'gold', 4, 4)}
      {C(star(50, 66, 10), 'gold', 3, 3)}
      {C(el(198, 160, 6), 'light', 2)}
    </>
  ),
  family: ({ C, S }) => (
    <>
      {S('M120 108V194q0 14-13 14q-11 0-12-11', 'navy', 7, 4)}
      {C('M44 112C44 64 80 38 120 38C160 38 196 64 196 112Q177 99 158 112Q139 99 120 112Q101 99 82 112Q63 99 44 112z', 'coral', 8, 4)}
      {C('M120 40C102 54 96 80 96 108Q108 100 120 112Q132 100 144 108C144 80 138 54 120 40z', 'orange', 0)}
      {C(el(120, 36, 6), 'gold', 3)}
      {C(HEART(120, 160, 1.15), 'blue', 7)}
    </>
  ),
  education: ({ C, S }) => (
    <>
      {C(rr(48, 166, 144, 28, 9), 'blue', 7)}
      <path d={rr(156, 172, 30, 16, 4)} fill="#f3efe8" />
      {C(rr(60, 138, 124, 28, 9), 'orange', 7)}
      <path d={rr(148, 144, 30, 16, 4)} fill="#f3efe8" />
      {C(rr(54, 110, 132, 28, 9), 'coral', 7)}
      <path d={rr(150, 116, 30, 16, 4)} fill="#f3efe8" />
      {C('M84 74V96Q120 116 156 96V74z', 'navy', 6)}
      {C('M120 32L190 62L120 92L50 62z', 'navy', 8, 6)}
      {S('M120 62L174 76V104', 'gold', 4, 2)}
      {C(el(174, 110, 7), 'gold', 3)}
      {C(el(120, 62, 6), 'gold', 2)}
    </>
  ),
  savings: ({ C, S }) => (
    <>
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>{C(el(196, 200 - i * 11, 22, 8), 'gold', 6)}</React.Fragment>
      ))}
      {C(rr(76, 164, 20, 32, 9), 'light', 5)}
      {C(rr(130, 164, 20, 32, 9), 'light', 5)}
      {S('M50 128q-16-4-12-16q4-9 12-1', 'light', 5, 3)}
      {C(el(112, 132, 66, 50), 'light', 7)}
      {C('M86 92L80 66L106 82z', 'light', 4, 6)}
      {C(el(176, 136, 14, 17), 'blue', 5)}
      <path d={el(172, 131, 2.5)} fill="#152a49" />
      <path d={el(180, 131, 2.5)} fill="#152a49" />
      <path d={el(148, 112, 5)} fill="#152a49" />
      <path d={rr(94, 84, 40, 8, 4)} fill="#24406b" />
      {C(el(114, 50, 17), 'gold', 5)}
      <path d={el(114, 50, 10)} fill="none" stroke="#c68714" strokeWidth="2.5" />
    </>
  ),
  retirement: ({ C }) => (
    <>
      {C(el(172, 64, 30), 'gold', 0)}
      {C(rr(80, 58, 8, 128, 4), 'navy', 3)}
      {C(rr(152, 58, 8, 128, 4), 'navy', 3)}
      {C('M90 60H150C150 98 130 112 124 122C130 132 150 146 150 184H90C90 146 110 132 116 122C110 112 90 98 90 60z', 'cream', 4)}
      {C('M98 72H142C140 92 128 104 120 112C112 104 100 92 98 72z', 'orange', 0)}
      {C('M96 180C98 160 112 150 120 146C128 150 142 160 144 180z', 'orange', 0)}
      <path d="M120 112V146" stroke="#f39436" strokeWidth="3" strokeDasharray="3 5" />
      {C(rr(70, 40, 100, 20, 10), 'blue', 6)}
      {C(rr(70, 184, 100, 20, 10), 'blue', 6)}
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>{C(el(48, 200 - i * 11, 20, 7), 'gold', 6)}</React.Fragment>
      ))}
    </>
  ),
  travel: ({ C }) => (
    <>
      {C('M36 150Q36 128 58 124L84 96Q92 86 106 86H150Q164 86 172 98L190 124Q206 128 206 146V158Q206 170 194 170H48Q36 170 36 158z', 'blue', 8, 4)}
      {C('M92 102Q96 96 104 96H122V122H78z', 'light', 0)}
      {C('M132 96H148Q156 96 160 102L174 122H132z', 'light', 0)}
      {C(el(196, 140, 6), 'gold', 2)}
      {C(rr(38, 136, 10, 12, 4), 'coral', 2)}
      {C(el(82, 172, 21), 'navy', 5)}
      {C(el(82, 172, 8), 'grey', 2)}
      {C(el(164, 172, 21), 'navy', 5)}
      {C(el(164, 172, 8), 'grey', 2)}
      {C('M188 84C174 68 166 58 166 48a22 22 0 0 1 44 0C210 58 202 68 188 84z', 'coral', 6)}
      <path d={el(188, 48, 8)} fill="#fff" />
    </>
  ),
  home: ({ C, S }) => (
    <>
      {C(rr(144, 54, 18, 36, 4), 'coral', 5)}
      {C(rr(56, 104, 112, 94, 10), 'cream', 7)}
      {C('M46 110L112 52L178 110z', 'coral', 8, 12)}
      {C(rr(96, 146, 30, 52, 8), 'blue', 4)}
      <path d={el(120, 174, 3)} fill="#f4b63a" />
      {C(rr(66, 126, 24, 24, 6), 'light', 3)}
      {C('M180 112L210 124V146C210 168 196 182 180 190C164 182 150 168 150 146V124z', 'blue', 7, 6)}
      {S('M167 150l9 9l17-19', 'cream', 7, 3)}
    </>
  ),
  city: ({ C, S }) => (
    <>
      {C(rr(44, 92, 54, 112, 8), 'light', 7)}
      {C(rr(150, 112, 50, 92, 8), 'navy', 7)}
      {C(rr(94, 48, 60, 156, 8), 'blue', 8)}
      {[0, 1, 2, 3, 4, 5].map((r) =>
        [0, 1].map((c) => <path key={`b${r}${c}`} d={rr(104 + c * 22, 62 + r * 18, 16, 10, 3)} fill="#d9eefc" />)
      )}
      {[0, 1, 2, 3].map((r) => <path key={`a${r}`} d={rr(56, 104 + r * 18, 30, 8, 3)} fill="#ffffff" opacity="0.8" />)}
      {[0, 1, 2].map((r) => <path key={`c${r}`} d={rr(160, 124 + r * 18, 30, 8, 3)} fill="#9fc8e6" />)}
      {S('M102 172v-8q0-8 8-8h20q8 0 8 8v8', 'navy', 6, 3)}
      {C(rr(78, 168, 84, 48, 11), 'orange', 7)}
      <path d="M78 186H162" stroke="#c46a1a" strokeWidth="4" />
      {C(rr(113, 180, 14, 14, 3), 'gold', 2)}
    </>
  ),
  shield: ({ C, S }) => (
    <>
      {C('M120 34L184 58V110C184 158 156 186 120 204C84 186 56 158 56 110V58z', 'blue', 9, 8)}
      {C('M120 54L166 72V110C166 146 146 168 120 182C94 168 74 146 74 110V72z', 'light', 0)}
      {S('M96 116l18 18l32-36', 'cream', 14, 5)}
      {C(star(188, 56, 16), 'gold', 4, 4)}
      {C(HEART(50, 168, 0.55), 'coral', 4)}
    </>
  ),
};

const SCENE_FOR: Record<string, string> = { campaign: 'shield', announce: 'shield', policy: 'shield', notice: 'shield', award: 'shield', celebrate: 'shield' };

export const Product3DArt: React.FC<{ scene: SceneKey; className?: string }> = ({ scene, className = '' }) => {
  const [id] = React.useState(key);
  const draw = SCENES[scene] || SCENES[SCENE_FOR[scene]] || SCENES.shield;
  const C: Draw['C'] = (d, m, depth = 6, round = 0) => (
    <g key={key()}>
      {depth > 0 && (
        <path d={d} fill={MAT[m].side} transform={`translate(0 ${depth})`} stroke={round ? MAT[m].side : undefined} strokeWidth={round || undefined} strokeLinejoin="round" />
      )}
      <path d={d} fill={`url(#${id}-${m})`} stroke={round ? `url(#${id}-${m})` : undefined} strokeWidth={round || undefined} strokeLinejoin="round" />
      <path d={d} fill={`url(#${id}-gloss)`} />
    </g>
  );
  const S: Draw['S'] = (d, m, w, depth = 4) => (
    <g key={key()} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={MAT[m].side} strokeWidth={w} transform={`translate(0 ${depth})`} />
      <path d={d} stroke={`url(#${id}-${m})`} strokeWidth={w} />
    </g>
  );
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <defs>
        {(Object.keys(MAT) as M[]).map((m) => (
          <linearGradient key={m} id={`${id}-${m}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={MAT[m].top} />
            <stop offset="1" stopColor={MAT[m].bottom} />
          </linearGradient>
        ))}
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0b2235" floodOpacity="0.28" />
        </filter>
      </defs>
      <ellipse cx="120" cy="222" rx="80" ry="9" fill="#000" opacity="0.18" />
      <g filter={`url(#${id}-sh)`}>{draw({ C, S, id })}</g>
    </svg>
  );
};

/** The 3D illustration that matches a product (Universal Life → globe …). */
export const Product3D: React.FC<{
  product: Pick<ProductKnowledgeItem, 'title' | 'subtitle' | 'category'> & { icon_key?: string | null };
  className?: string;
}> = ({ product, className }) => <Product3DArt scene={resolveProductScene(product)} className={className} />;
