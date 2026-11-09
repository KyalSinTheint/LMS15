/**
 * Picture backgrounds for product cards: a soft, blurred scene that matches
 * the product (Universal Life → space and the Earth, Health → medical,
 * Education → books and a graduation cap …). All scenes are original SVG
 * drawings, so there are no image files or licences to manage.
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

// Small deterministic random generator so stars / bokeh look the same on every render
const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const dots = (n: number, seed: number, w = 400, h = 300) => {
  const r = rand(seed);
  return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, s: r() }));
};

const SCENES: Record<SceneKey, () => React.ReactElement> = {
  universe: () => (
    <>
      <defs>
        <linearGradient id="u-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#050a24" />
          <stop offset="0.55" stopColor="#14205a" />
          <stop offset="1" stopColor="#2a1450" />
        </linearGradient>
        <radialGradient id="u-neb1" cx="0.25" cy="0.3" r="0.45">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.75" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="u-neb2" cx="0.8" cy="0.75" r="0.4">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.6" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="u-earth" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.45" stopColor="#1d74c4" />
          <stop offset="1" stopColor="#0b2a5c" />
        </radialGradient>
        <radialGradient id="u-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#7dd3fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#u-sky)" />
      <rect width="400" height="300" fill="url(#u-neb1)" />
      <rect width="400" height="300" fill="url(#u-neb2)" />
      {dots(110, 7).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={0.4 + d.s * 1.6} fill="#fff" opacity={0.35 + d.s * 0.65} />
      ))}
      <circle cx="300" cy="190" r="118" fill="url(#u-glow)" />
      <circle cx="300" cy="190" r="86" fill="url(#u-earth)" />
      <path d="M248 160c18-14 40-10 52 4s30 12 40 0c6 16-4 30-22 32s-30 12-44 6-34-24-26-42z" fill="#34d399" opacity="0.75" />
      <path d="M268 232c14-8 32-6 44 4-10 10-30 14-44-4z" fill="#34d399" opacity="0.6" />
      <ellipse cx="90" cy="70" rx="26" ry="26" fill="#f59e0b" opacity="0.85" />
      <ellipse cx="90" cy="70" rx="46" ry="9" fill="none" stroke="#fde68a" strokeWidth="3" opacity="0.7" transform="rotate(-18 90 70)" />
    </>
  ),
  family: () => (
    <>
      <defs>
        <linearGradient id="f-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1f6e" />
          <stop offset="0.5" stopColor="#e2557a" />
          <stop offset="1" stopColor="#ffb36b" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f-sky)" />
      <circle cx="270" cy="190" r="60" fill="#ffd89a" opacity="0.9" />
      <path d="M0 230 Q100 190 200 225 T400 215 V300 H0z" fill="#7a2f5a" opacity="0.85" />
      <path d="M0 255 Q120 225 240 255 T400 250 V300 H0z" fill="#3d1640" />
      {/* family under an umbrella */}
      <path d="M120 175 a55 40 0 0 1 110 0z" fill="#176B98" />
      <line x1="175" y1="175" x2="175" y2="250" stroke="#1b0d24" strokeWidth="3" />
      <circle cx="152" cy="205" r="9" fill="#1b0d24" />
      <rect x="143" y="214" width="18" height="38" rx="8" fill="#1b0d24" />
      <circle cx="198" cy="203" r="9" fill="#1b0d24" />
      <rect x="189" y="212" width="18" height="40" rx="8" fill="#1b0d24" />
      <circle cx="176" cy="222" r="6" fill="#1b0d24" />
      <rect x="170" y="228" width="12" height="24" rx="5" fill="#1b0d24" />
    </>
  ),
  health: () => (
    <>
      <defs>
        <linearGradient id="h-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#064e5c" />
          <stop offset="1" stopColor="#0ea5a4" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#h-bg)" />
      {dots(14, 3).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={10 + d.s * 30} fill="#a7f3d0" opacity={0.08 + d.s * 0.12} />
      ))}
      <g opacity="0.85">
        <rect x="270" y="40" width="34" height="100" rx="8" fill="#ecfeff" />
        <rect x="237" y="73" width="100" height="34" rx="8" fill="#ecfeff" />
      </g>
      <g opacity="0.35">
        <rect x="60" y="190" width="20" height="60" rx="5" fill="#ecfeff" />
        <rect x="40" y="210" width="60" height="20" rx="5" fill="#ecfeff" />
      </g>
      <polyline
        points="0,200 110,200 135,200 150,150 168,250 186,175 200,200 400,200"
        fill="none"
        stroke="#fb7185"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  ),
  education: () => (
    <>
      <defs>
        <linearGradient id="e-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#e-bg)" />
      {dots(40, 11).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y * 0.6} r={0.6 + d.s * 1.4} fill="#fde68a" opacity={0.4 + d.s * 0.6} />
      ))}
      {/* open book */}
      <path d="M200 250 C160 230 110 230 70 245 V170 C110 155 160 155 200 175z" fill="#f8fafc" />
      <path d="M200 250 C240 230 290 230 330 245 V170 C290 155 240 155 200 175z" fill="#e2e8f0" />
      <line x1="200" y1="175" x2="200" y2="250" stroke="#94a3b8" strokeWidth="2" />
      {/* graduation cap */}
      <path d="M290 70 L345 50 L400 70 L345 90z" fill="#0f172a" />
      <path d="M312 78 v18 q33 14 66 0 v-18 l-33 12z" fill="#1e293b" />
      <line x1="398" y1="70" x2="398" y2="98" stroke="#fbbf24" strokeWidth="3" />
      <circle cx="398" cy="102" r="5" fill="#fbbf24" />
    </>
  ),
  savings: () => (
    <>
      <defs>
        <linearGradient id="s-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#052e2b" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="s-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#s-bg)" />
      {dots(16, 5).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={6 + d.s * 22} fill="#fcd34d" opacity={0.06 + d.s * 0.12} />
      ))}
      {[0, 1, 2, 3].map((col) =>
        Array.from({ length: 2 + col * 2 }, (_, k) => (
          <ellipse key={`${col}-${k}`} cx={200 + col * 52} cy={262 - k * 12} rx="22" ry="8" fill="url(#s-coin)" stroke="#92400e" strokeWidth="1" />
        ))
      )}
      <polyline points="40,230 110,190 160,205 230,130 290,145 370,60" fill="none" stroke="#a7f3d0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M370 60 l-22 4 l14 16z" fill="#a7f3d0" />
    </>
  ),
  retirement: () => (
    <>
      <defs>
        <linearGradient id="r-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.55" stopColor="#f97316" />
          <stop offset="0.62" stopColor="#fdba74" />
          <stop offset="1" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#r-sky)" />
      <circle cx="200" cy="175" r="52" fill="#fde68a" />
      <rect y="178" width="400" height="122" fill="#0c4a6e" opacity="0.9" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={150 + i * 4 - i * 14} y={190 + i * 14} width={100 + i * 20} height="3" rx="1.5" fill="#fde68a" opacity={0.55 - i * 0.08} />
      ))}
      <path d="M40 300 C50 230 60 200 70 180" stroke="#1c1917" strokeWidth="6" fill="none" />
      <path d="M70 180 q-30 -10 -48 6 M70 180 q-10 -28 10 -40 M70 180 q26 -16 46 0 M70 180 q20 6 26 30" stroke="#1c1917" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  travel: () => (
    <>
      <defs>
        <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset="0.6" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#t-sky)" />
      <path d="M150 300 L195 160 L205 160 L250 300z" fill="#1e293b" />
      <path d="M198 175 v12 M199 205 v18 M200 245 v26" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
      <path d="M0 210 Q200 150 400 210 V300 H0z" fill="#0f172a" opacity="0.5" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${60 + i * 8} ${290 - i * 30} L${170 - i * 6} ${200 - i * 10}`} stroke="#f43f5e" strokeWidth={6 - i * 1.5} opacity="0.6" strokeLinecap="round" />
      ))}
      <g transform="translate(300 70) rotate(-12)" fill="#f8fafc">
        <path d="M-40 0 L40 -4 L46 0 L40 4z" />
        <path d="M0 0 L-14 -26 L-6 -26 L14 -2z" />
        <path d="M0 0 L-14 26 L-6 26 L14 2z" />
        <path d="M-36 0 L-44 -10 L-40 0 L-44 10z" />
      </g>
    </>
  ),
  home: () => (
    <>
      <defs>
        <linearGradient id="hm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#hm-sky)" />
      <circle cx="320" cy="70" r="28" fill="#fef3c7" opacity="0.9" />
      <rect y="250" width="400" height="50" fill="#14532d" />
      {[
        [40, 1],
        [150, 1.3],
        [280, 1.1],
      ].map(([x, s], i) => (
        <g key={i} transform={`translate(${x} ${250}) scale(${s})`}>
          <path d="M0 0 V-55 L40 -90 L80 -55 V0z" fill="#3f1d38" />
          <rect x="14" y="-45" width="16" height="16" fill="#fde68a" />
          <rect x="50" y="-45" width="16" height="16" fill="#fde68a" />
          <rect x="32" y="-26" width="16" height="26" fill="#fbbf24" />
        </g>
      ))}
    </>
  ),
  city: () => (
    <>
      <defs>
        <linearGradient id="c-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020617" />
          <stop offset="1" stopColor="#176B98" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#c-sky)" />
      {[
        [10, 140, 50],
        [65, 90, 45],
        [115, 160, 40],
        [160, 60, 55],
        [222, 120, 45],
        [272, 80, 50],
        [328, 150, 62],
      ].map(([x, top, w], i) => {
        const r = rand(i + 21);
        return (
          <g key={i}>
            <rect x={x} y={top} width={w} height={300 - top} fill="#0b1324" />
            {Array.from({ length: Math.floor((300 - top) / 16) * 3 }, (_, k) => {
              const cx = x + 6 + (k % 3) * ((w - 12) / 3);
              const cy = top + 8 + Math.floor(k / 3) * 16;
              return r() > 0.45 ? <rect key={k} x={cx} y={cy} width="7" height="7" fill="#fde68a" opacity={0.5 + r() * 0.5} /> : null;
            })}
          </g>
        );
      })}
    </>
  ),
  shield: () => (
    <>
      <defs>
        <linearGradient id="sh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b2a4a" />
          <stop offset="1" stopColor="#176B98" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sh-bg)" />
      {dots(18, 9).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={8 + d.s * 34} fill="#7dd3fc" opacity={0.06 + d.s * 0.14} />
      ))}
      <path d="M300 50 L360 72 V130 C360 175 330 205 300 220 C270 205 240 175 240 130 V72z" fill="#e0f2fe" opacity="0.85" />
      <path d="M272 135 l20 20 l38 -42" stroke="#176B98" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  campaign: () => (
    <>
      <defs>
        <linearGradient id="cp-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c2d12" />
          <stop offset="0.5" stopColor="#ea580c" />
          <stop offset="1" stopColor="#facc15" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#cp-bg)" />
      {dots(60, 13).map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={4 + d.s * 6} height={8 + d.s * 6} rx="1.5" fill={['#fef08a', '#ffffff', '#38bdf8', '#f472b6'][i % 4]} opacity={0.55 + d.s * 0.4} transform={`rotate(${d.s * 180} ${d.x} ${d.y})`} />
      ))}
      {/* target with arrow */}
      <circle cx="285" cy="160" r="78" fill="#fff7ed" />
      <circle cx="285" cy="160" r="56" fill="#dc2626" />
      <circle cx="285" cy="160" r="36" fill="#fff7ed" />
      <circle cx="285" cy="160" r="16" fill="#dc2626" />
      <line x1="285" y1="160" x2="365" y2="90" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
      <path d="M365 90 l18 -6 l-6 18z M365 90 l8 -20 l6 12z" fill="#1e293b" />
      <polyline points="30,250 90,215 140,228 200,170" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </>
  ),
  announce: () => (
    <>
      <defs>
        <linearGradient id="an-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0c4a6e" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#an-bg)" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${300 + i * 22} ${110 - i * 18} q${30 + i * 8} ${40 + i * 18} 0 ${80 + i * 36}`} fill="none" stroke="#e0f2fe" strokeWidth="6" strokeLinecap="round" opacity={0.8 - i * 0.2} />
      ))}
      {/* megaphone */}
      <path d="M110 125 L270 70 V230 L110 175z" fill="#f8fafc" />
      <rect x="80" y="122" width="38" height="56" rx="10" fill="#fbbf24" />
      <path d="M130 178 l18 52 h26 l-14 -46z" fill="#e2e8f0" />
      <rect x="262" y="66" width="18" height="168" rx="9" fill="#cbd5e1" />
    </>
  ),
  policy: () => (
    <>
      <defs>
        <linearGradient id="po-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#po-bg)" />
      <g transform="rotate(-6 170 160)">
        <rect x="95" y="60" width="150" height="190" rx="10" fill="#f8fafc" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x="115" y={90 + i * 20} width={i === 0 ? 90 : 110 - (i % 3) * 18} height="7" rx="3.5" fill={i === 0 ? '#176B98' : '#cbd5e1'} />
        ))}
      </g>
      <path d="M300 95 L350 115 V160 C350 195 326 218 300 230 C274 218 250 195 250 160 V115z" fill="#38bdf8" />
      <path d="M278 160 l16 16 l30 -34" stroke="#0f172a" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  notice: () => (
    <>
      <defs>
        <linearGradient id="no-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#134e4a" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#no-bg)" />
      {dots(14, 17).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={8 + d.s * 26} fill="#ccfbf1" opacity={0.06 + d.s * 0.12} />
      ))}
      {/* bell */}
      <path d="M200 60 c-46 0 -70 36 -70 80 v40 l-22 30 h184 l-22 -30 v-40 c0 -44 -24 -80 -70 -80z" fill="#fef3c7" />
      <circle cx="200" cy="232" r="18" fill="#fbbf24" />
      <circle cx="200" cy="52" r="10" fill="#fef3c7" />
      <circle cx="285" cy="80" r="22" fill="#ef4444" />
      <text x="285" y="88" textAnchor="middle" fontSize="24" fontWeight="900" fill="#fff" fontFamily="Arial">!</text>
    </>
  ),
  award: () => (
    <>
      <defs>
        <linearGradient id="aw-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f2937" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="aw-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#aw-bg)" />
      {dots(40, 23).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={1 + d.s * 2.5} fill="#fde68a" opacity={0.4 + d.s * 0.6} />
      ))}
      {/* trophy */}
      <path d="M150 60 h100 v40 c0 40 -22 66 -50 70 c-28 -4 -50 -30 -50 -70z" fill="url(#aw-gold)" />
      <path d="M150 75 h-28 c0 34 16 50 34 52 M250 75 h28 c0 34 -16 50 -34 52" fill="none" stroke="#f59e0b" strokeWidth="8" />
      <rect x="188" y="168" width="24" height="40" fill="#d97706" />
      <rect x="160" y="206" width="80" height="22" rx="4" fill="url(#aw-gold)" />
      <path d="M200 82 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2z" fill="#fff7ed" />
    </>
  ),
  celebrate: () => (
    <>
      <defs>
        <linearGradient id="ce-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#581c87" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#ce-bg)" />
      {[
        [90, 90, '#fde047'],
        [300, 70, '#38bdf8'],
        [210, 130, '#f472b6'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            return <line key={k} x1={Number(x)} y1={Number(y)} x2={Number(x) + Math.cos(a) * 46} y2={Number(y) + Math.sin(a) * 46} stroke={String(c)} strokeWidth="4" strokeLinecap="round" opacity="0.85" />;
          })}
          <circle cx={Number(x)} cy={Number(y)} r="7" fill="#fff" />
        </g>
      ))}
      {[[70, 230, '#fde047'], [150, 250, '#38bdf8'], [330, 220, '#a7f3d0']].map(([x, y, c], i) => (
        <g key={i}>
          <ellipse cx={Number(x)} cy={Number(y)} rx="24" ry="30" fill={String(c)} />
          <path d={`M${x} ${Number(y) + 30} q6 20 -4 40`} stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      ))}
    </>
  ),
};

/**
 * Full-size blurred picture for the back of a product card. Put it as the
 * first child of a `relative overflow-hidden` element.
 */
export const ProductScene: React.FC<{ product: ProductLike; blur?: number; className?: string }> = ({ product, blur = 5, className = '' }) => (
  <SceneBackground scene={resolveProductScene(product)} blur={blur} className={className} />
);

/** A blurred scene by name (used by product cards and Company Bulletin). */
export const SceneBackground: React.FC<{ scene: SceneKey; blur?: number; className?: string; overlay?: boolean }> = ({
  scene,
  blur = 5,
  className = '',
  overlay = true,
}) => {
  const Scene = SCENES[scene] || SCENES.shield;
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full scale-110 transition-transform duration-500 group-hover:scale-[1.16]"
        style={{ filter: `blur(${blur}px) saturate(1.15)` }}
      >
        <Scene />
      </svg>
      {/* keeps the white text readable */}
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />}
    </div>
  );
};
