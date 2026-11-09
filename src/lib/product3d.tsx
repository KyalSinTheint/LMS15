/**
 * Glossy "3D clay" illustrations for products (Health → clipboard, cross and
 * pills; Universal Life → globe with an orbit; Education → cap on books …).
 * Original SVG artwork: every shape has a darker side for depth, a gradient
 * face and a soft highlight, so it looks like a rendered 3D icon while staying
 * sharp at any size.
 */
import React from 'react';
import type { ProductKnowledgeItem } from '../types/lms';

type M = 'blue' | 'light' | 'orange' | 'coral' | 'cream' | 'gold' | 'green' | 'navy' | 'grey' | 'skin';
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
  skin: { top: '#ffe0c2', bottom: '#f2b48a', side: '#c98a63' },
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

const DROP = (x: number, y: number, z = 1) => `M${x} ${y}c${-6 * z} ${8 * z} ${-8 * z} ${12 * z} ${-8 * z} ${16 * z}a${8 * z} ${8 * z} 0 0 0 ${16 * z} 0c0 ${-4 * z} ${-2 * z} ${-8 * z} ${-8 * z} ${-16 * z}z`;
/** a simple clay person: rounded body and a head */
const person = (C: Draw['C'], cx: number, top: number, sc: number, m: M) => (
  <React.Fragment key={`p${cx}-${top}`}>
    {C(rr(cx - 27 * sc, top + 40 * sc, 54 * sc, 70 * sc, 26 * sc), m, 6)}
    {C(el(cx, top + 20 * sc, 19 * sc), 'skin', 4)}
  </React.Fragment>
);

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
  protect: ({ C, S }) => (
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
  family: ({ C }) => (
    <>
      {C(HEART(120, 40, 0.5), 'gold', 3)}
      {person(C, 82, 62, 1.05, 'blue')}
      {person(C, 158, 62, 1.05, 'coral')}
      {person(C, 120, 110, 0.75, 'orange')}
    </>
  ),
  group: ({ C }) => (
    <>
      {person(C, 66, 44, 0.85, 'light')}
      {person(C, 120, 36, 0.85, 'navy')}
      {person(C, 174, 44, 0.85, 'light')}
      {person(C, 93, 94, 1, 'blue')}
      {person(C, 147, 94, 1, 'orange')}
    </>
  ),
  rainy: ({ C, S }) => (
    <>
      {[[48, 118], [190, 120], [40, 166], [198, 170], [98, 98], [146, 96]].map(([x, y], i) => (
        <React.Fragment key={i}>{C(DROP(x, y, i > 3 ? 0.7 : 1), 'light', 2)}</React.Fragment>
      ))}
      {C(rr(70, 58, 108, 30, 15), 'cream', 5)}
      {C(el(98, 58, 24), 'cream', 4)}
      {C(el(134, 48, 30), 'cream', 4)}
      {C(el(164, 64, 18), 'cream', 4)}
      <g transform="translate(36 96) scale(0.7)">
        {S('M120 108V180q0 14-13 14q-11 0-12-11', 'navy', 9, 5)}
        {C('M44 112C44 64 80 38 120 38C160 38 196 64 196 112Q177 99 158 112Q139 99 120 112Q101 99 82 112Q63 99 44 112z', 'blue', 9, 5)}
        {C('M120 40C102 54 96 80 96 108Q108 100 120 112Q132 100 144 108C144 80 138 54 120 40z', 'light', 0)}
        {C(el(120, 36, 7), 'gold', 3)}
      </g>
    </>
  ),
  bank: ({ C }) => (
    <>
      {C('M44 84L120 40L196 84z', 'navy', 7, 8)}
      {C(el(120, 68, 9), 'gold', 2)}
      {C(rr(48, 86, 144, 14, 5), 'light', 4)}
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>{C(rr(60 + i * 34, 102, 18, 68, 5), 'cream', 4)}</React.Fragment>
      ))}
      {C(rr(44, 170, 152, 14, 5), 'light', 4)}
      {C(rr(36, 186, 168, 14, 6), 'blue', 6)}
      <g transform="rotate(-12 184 176)">
        {C(rr(146, 150, 76, 50, 9), 'orange', 6)}
        <path d={rr(146, 162, 76, 9, 0)} fill="#24406b" />
        {C(rr(156, 178, 16, 12, 3), 'gold', 0)}
      </g>
    </>
  ),
  accident: ({ C, S }) => (
    <>
      {S('M164 72L156 204', 'grey', 8, 3)}
      {S('M150 70H178', 'navy', 10, 3)}
      {S('M159 132H171', 'navy', 7, 2)}
      {C(rr(70, 100, 68, 100, 32), 'blue', 7)}
      {C(el(104, 75, 24), 'skin', 4)}
      {S('M81 70Q104 56 127 70', 'cream', 9, 2)}
      <g transform="rotate(-25 117 58)">{C(rr(104, 52, 26, 11, 5), 'orange', 2)}</g>
      {S('M82 134L128 102', 'coral', 6, 2)}
      {C(rr(76, 128, 60, 22, 11), 'cream', 4)}
      {C(plus(106, 139, 13, 4.5), 'coral', 0)}
    </>
  ),
  hospital: ({ C }) => (
    <>
      {C(rr(84, 44, 72, 46, 8), 'cream', 6)}
      {C(plus(120, 66, 30, 11), 'coral', 4, 3)}
      {C(rr(48, 86, 144, 116, 10), 'cream', 8)}
      {C(rr(44, 80, 152, 12, 6), 'light', 4)}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (c === 1 || c === 2) && r === 2 ? null : <path key={`${r}${c}`} d={rr(60 + c * 32, 102 + r * 30, 22, 18, 4)} fill="#9fd0ec" />)
      )}
      {C(rr(102, 158, 36, 44, 6), 'blue', 3)}
    </>
  ),
  heartcare: ({ C, S }) => (
    <>
      {S('M156 150Q160 196 126 202Q96 206 92 182', 'grey', 7, 3)}
      {C(HEART(120, 102, 1.9), 'coral', 9)}
      {S('M62 104H90L102 82L118 128L130 98H178', 'cream', 7, 2)}
      {C(el(92, 178, 13), 'grey', 4)}
      {C(el(92, 178, 6), 'light', 1)}
    </>
  ),
  medicine: ({ C }) => (
    <>
      {C(rr(62, 84, 86, 118, 20), 'orange', 8)}
      {C(rr(70, 52, 70, 36, 9), 'cream', 5)}
      {C(rr(74, 112, 62, 58, 9), 'cream', 3)}
      {C(plus(105, 141, 28, 10), 'coral', 0)}
      <g transform="rotate(30 178 120)">
        {C(rr(156, 106, 46, 22, 11), 'cream', 5)}
        {C(rr(156, 106, 24, 22, 11), 'blue', 5)}
      </g>
      {C(el(176, 184, 15, 13), 'light', 5)}
      <path d="M165 184h22" stroke="#4b8fc4" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  ribbon: ({ C, S }) => (
    <>
      {S('M120 146L84 204', 'coral', 22, 6)}
      {S('M120 146C66 86 94 38 120 38C146 38 174 86 120 146', 'coral', 22, 6)}
      {S('M120 146L156 204', 'coral', 22, 6)}
      {C(star(184, 58, 13), 'gold', 3, 3)}
      {C(star(56, 92, 9), 'gold', 3, 3)}
    </>
  ),
  plane: ({ C }) => (
    <>
      {C(rr(150, 160, 60, 22, 11), 'cream', 3)}
      {C(el(172, 158, 14), 'cream', 3)}
      <g transform="rotate(-22 120 120)">
        {C('M104 118L150 118L118 184L98 184z', 'blue', 6)}
        {C('M40 112L56 74L72 74L70 112z', 'blue', 5)}
        {C('M28 120Q28 106 46 104L188 100Q214 104 214 118Q214 132 188 134L46 132Q28 132 28 120z', 'cream', 7)}
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={el(96 + i * 18, 114, 4.5)} fill="#5aa9e0" />)}
        {C('M104 104L146 104L124 60L108 60z', 'light', 4)}
      </g>
    </>
  ),
  document: ({ C }) => (
    <>
      {C(rr(60, 34, 108, 156, 12), 'cream', 7)}
      {C(rr(74, 52, 60, 12, 6), 'blue', 0)}
      {[0, 1, 2, 3].map((i) => <path key={i} d={rr(74, 78 + i * 18, 80 - (i % 2) * 22, 8, 4)} fill="#b5bfcc" />)}
      {C('M144 176L136 214L150 204L162 214L156 176z', 'coral', 3)}
      {C('M164 176L172 214L158 204L146 214L152 176z', 'coral', 3)}
      {C(el(152, 164, 24), 'gold', 5)}
      {C(star(152, 164, 12), 'orange', 0)}
      <g transform="rotate(35 190 90)">
        {C(rr(180, 44, 18, 96, 8), 'orange', 4)}
        {C('M180 136H198L189 156z', 'cream', 2)}
      </g>
    </>
  ),
  wallet: ({ C }) => (
    <>
      <g transform="rotate(-10 120 80)">{C(rr(60, 52, 116, 52, 8), 'green', 4)}</g>
      {C(rr(70, 60, 110, 48, 8), 'green', 4)}
      <path d={el(125, 84, 10)} fill="#2b8a4f" opacity="0.5" />
      {C(rr(40, 92, 160, 108, 20), 'blue', 8)}
      {C(rr(136, 120, 70, 46, 14), 'light', 5)}
      {C(el(160, 143, 9), 'gold', 2)}
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>{C(el(56, 200 - i * 10, 20, 7), 'gold', 5)}</React.Fragment>
      ))}
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

export const Product3DArt: React.FC<{ scene: string; className?: string }> = ({ scene, className = '' }) => {
  const [id] = React.useState(key);
  const draw = SCENES[scene] || SCENES.shield;
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

// ---- which picture each product gets ----------------------------------------
export const PRODUCT_ART_LABELS: Record<string, string> = {
  health: 'Medical clipboard',
  hospital: 'Hospital',
  heartcare: 'Heart care',
  medicine: 'Medicine',
  ribbon: 'Critical illness ribbon',
  accident: 'Personal accident',
  group: 'Group of people',
  family: 'Family',
  protect: 'Umbrella & heart',
  rainy: 'Rainy day umbrella',
  bank: 'Bank & credit',
  universe: 'Globe',
  education: 'Graduation & books',
  savings: 'Piggy bank',
  wallet: 'Wallet & cash',
  retirement: 'Hourglass',
  travel: 'Car',
  plane: 'Plane',
  home: 'House',
  city: 'Business city',
  document: 'Policy document',
  shield: 'Shield',
};

const MEDICAL = ['health', 'heartcare', 'hospital', 'medicine', 'ribbon'];
const RULES: [RegExp, string[]][] = [
  [/rainy|\brain\b|umbrella/i, ['rainy', 'protect']],
  [/\bp\.?a\.?\b|personal accident|accident|injur/i, ['accident']],
  [/group|team|employee|staff|corporate|micro/i, ['group', 'city']],
  [/credit|loan|bank|banca|mortgage|debt/i, ['bank', 'wallet']],
  [/cancer|critical|illness|disease/i, ['ribbon', 'heartcare']],
  [/hospital|in-?patient|surgery|cash ?plan/i, ['hospital', ...MEDICAL]],
  [/health|medical|medi|care|clinic|doctor|heart/i, MEDICAL],
  [/universal|global|world|whole[- ]?life/i, ['universe']],
  [/retire|pension|annuit|golden|senior/i, ['retirement', 'wallet']],
  [/educat|student|school|scholar|child|kid|junior/i, ['education', 'family']],
  [/travel|trip|flight|abroad|overseas/i, ['plane', 'travel']],
  [/motor|\bcar\b|vehicle|auto/i, ['travel']],
  [/home|house|property|fire|building/i, ['home']],
  [/business|sme|commercial|enterprise/i, ['city', 'document']],
  [/endow|saving|wealth|invest|unit[- ]?link|cash|money/i, ['savings', 'wallet']],
  [/family|parent|mother|father/i, ['family', 'protect']],
  [/term|protect|life|secure|guard/i, ['protect', 'shield', 'document', 'family']],
];
const ALL_ART = Object.keys(PRODUCT_ART_LABELS);

export type ArtProduct = Pick<ProductKnowledgeItem, 'title' | 'subtitle' | 'category'> & { id?: string; display_order?: number | null };

/** Pictures that fit the product, best first, then every other picture. */
export function productArtCandidates(p: ArtProduct): string[] {
  const title = `${p.title || ''} ${p.subtitle || ''}`;
  const all = `${title} ${p.category || ''}`;
  const out: string[] = [];
  // the product's own name decides first, then its category
  for (const text of [title, all]) for (const [re, keys] of RULES) if (re.test(text)) out.push(...keys);
  return [...new Set([...out, ...ALL_ART])];
}

/**
 * Gives every product its own picture: in display order, each product takes
 * the best-fitting picture no earlier product has. Only when every picture is
 * used do pictures repeat.
 */
export function assignProductArt(products: ArtProduct[]): Map<string, string> {
  const sorted = [...products].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(a.title).localeCompare(String(b.title))
  );
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const p of sorted) {
    if (used.size >= ALL_ART.length) used.clear();
    const c = productArtCandidates(p);
    const pick = c.find((k) => !used.has(k)) || c[0];
    used.add(pick);
    if (p.id) map.set(p.id, pick);
  }
  return map;
}
