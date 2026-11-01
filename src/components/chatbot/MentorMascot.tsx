/**
 * "Sensei" — the LMS Assistant mascot: an original wise red-panda mentor
 * wearing a graduation cap, drawn in the KBZ Life palette
 * (brand blue #176B98, navy #003366, sky #a5e0f2, white).
 */
import React from 'react';

export const MentorMascot: React.FC<{ className?: string; title?: string }> = ({ className, title = 'KBZ Life Assistant' }) => (
  <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title}>
    <title>{title}</title>
    <defs>
      <linearGradient id="kbz-mascot-fur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a8cc4" />
        <stop offset="100%" stopColor="#176B98" />
      </linearGradient>
      <linearGradient id="kbz-mascot-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e3f3fb" />
      </linearGradient>
    </defs>

    {/* Badge background */}
    <circle cx="50" cy="50" r="48" fill="url(#kbz-mascot-bg)" stroke="#176B98" strokeWidth="3" />

    {/* Ears */}
    <path d="M20 40 Q16 20 32 22 Q36 30 34 38 Z" fill="url(#kbz-mascot-fur)" />
    <path d="M80 40 Q84 20 68 22 Q64 30 66 38 Z" fill="url(#kbz-mascot-fur)" />
    <path d="M23 36 Q22 26 30 27 Q32 32 31 36 Z" fill="#a5e0f2" />
    <path d="M77 36 Q78 26 70 27 Q68 32 69 36 Z" fill="#a5e0f2" />

    {/* Head */}
    <ellipse cx="50" cy="56" rx="31" ry="28" fill="url(#kbz-mascot-fur)" />

    {/* White face markings (red-panda brow spots, cheeks and muzzle) */}
    <ellipse cx="38" cy="45" rx="6" ry="4" fill="#ffffff" />
    <ellipse cx="62" cy="45" rx="6" ry="4" fill="#ffffff" />
    <path d="M24 62 Q30 50 40 58 Q44 70 50 72 Q56 70 60 58 Q70 50 76 62 Q72 80 50 82 Q28 80 24 62 Z" fill="#ffffff" />

    {/* Eyes (friendly, slightly smiling) */}
    <ellipse cx="39" cy="55" rx="4" ry="4.6" fill="#003366" />
    <ellipse cx="61" cy="55" rx="4" ry="4.6" fill="#003366" />
    <circle cx="40.4" cy="53.4" r="1.4" fill="#ffffff" />
    <circle cx="62.4" cy="53.4" r="1.4" fill="#ffffff" />

    {/* Nose and smile */}
    <ellipse cx="50" cy="65" rx="4.2" ry="3" fill="#003366" />
    <path d="M44 70 Q50 75 56 70" fill="none" stroke="#003366" strokeWidth="2" strokeLinecap="round" />

    {/* Graduation cap (the "mentor") */}
    <path d="M28 26 L50 16 L72 26 L50 35 Z" fill="#003366" />
    <path d="M38 30 L38 36 Q50 42 62 36 L62 30 L50 35 Z" fill="#0b2a4a" />
    <path d="M72 26 L72 36" stroke="#f5c542" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="72" cy="37.5" r="2.2" fill="#f5c542" />
  </svg>
);
