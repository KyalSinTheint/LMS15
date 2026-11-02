/**
 * "Trainer Panda" — the LMS Assistant mascot: an original, cheerful giant
 * panda wearing an operator headset (headband, ear cups and a microphone),
 * drawn in the KBZ Life palette (navy #003366 instead of black, brand blue
 * #176B98, sky #a5e0f2, gold microphone tip).
 */
import React from 'react';

export const MentorMascot: React.FC<{ className?: string; title?: string }> = ({
  className,
  title = 'Trainer Panda — KBZ Life Assistant',
}) => (
  <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title}>
    <title>{title}</title>
    <defs>
      <linearGradient id="kbz-panda-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2a8cc4" />
        <stop offset="100%" stopColor="#176B98" />
      </linearGradient>
      <radialGradient id="kbz-panda-face" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e8f4fa" />
      </radialGradient>
    </defs>

    {/* Badge background in brand blue */}
    <circle cx="50" cy="50" r="48" fill="url(#kbz-panda-bg)" stroke="#ffffff" strokeWidth="3" />

    {/* Ears */}
    <circle cx="25" cy="34" r="11" fill="#003366" />
    <circle cx="75" cy="34" r="11" fill="#003366" />
    <circle cx="25" cy="34" r="5" fill="#a5e0f2" opacity="0.55" />
    <circle cx="75" cy="34" r="5" fill="#a5e0f2" opacity="0.55" />

    {/* Head */}
    <ellipse cx="50" cy="57" rx="31" ry="28" fill="url(#kbz-panda-face)" />

    {/* Eye patches (tilted, panda-style) */}
    <ellipse cx="38" cy="55" rx="8" ry="10" fill="#003366" transform="rotate(-25 38 55)" />
    <ellipse cx="62" cy="55" rx="8" ry="10" fill="#003366" transform="rotate(25 62 55)" />

    {/* Eyes: one open, one cheeky wink */}
    <circle cx="39" cy="55" r="3.6" fill="#ffffff" />
    <circle cx="39.8" cy="55.6" r="2" fill="#0b2a4a" />
    <circle cx="40.6" cy="54.6" r="0.8" fill="#ffffff" />
    <path d="M58 56 Q62 52.5 66 56" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />

    {/* Rosy cheeks */}
    <ellipse cx="30" cy="68" rx="4" ry="2.4" fill="#f59fb3" opacity="0.55" />
    <ellipse cx="70" cy="68" rx="4" ry="2.4" fill="#f59fb3" opacity="0.55" />

    {/* Nose and grin */}
    <ellipse cx="50" cy="66" rx="4.4" ry="3.2" fill="#003366" />
    <path d="M43 71 Q50 78 57 71" fill="none" stroke="#003366" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M48 75.5 Q50 78.5 52 75.5 Z" fill="#f59fb3" />

    {/* Operator headset: headband over the head, ear cups, microphone */}
    <path d="M17 56 Q15 13 50 12 Q85 13 83 56" fill="none" stroke="#003366" strokeWidth="4.2" strokeLinecap="round" />
    <path d="M22 40 Q26 19 50 17" fill="none" stroke="#a5e0f2" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
    <rect x="10.5" y="47" width="13" height="19" rx="6" fill="#003366" />
    <rect x="76.5" y="47" width="13" height="19" rx="6" fill="#003366" />
    <rect x="13" y="50" width="5" height="13" rx="2.5" fill="#176B98" />
    <rect x="82" y="50" width="5" height="13" rx="2.5" fill="#176B98" />
    <path d="M17 65 Q19 80 37 78" fill="none" stroke="#003366" strokeWidth="2.6" strokeLinecap="round" />
    <ellipse cx="39.5" cy="77.6" rx="3.6" ry="2.8" fill="#f5c542" stroke="#003366" strokeWidth="1.2" />
  </svg>
);
