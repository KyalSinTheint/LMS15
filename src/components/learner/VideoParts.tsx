/**
 * Playback of a video that was uploaded in parts (each under the 50 MB storage
 * limit). Parts play back-to-back in the same player; progress is tracked on
 * the whole-video timeline (part start + time within the part).
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, Film, Play } from 'lucide-react';
import type { VideoPart } from '../../types/lms';
import { formatVideoClock } from '../../lib/storageUtils';

export function normalizeVideoParts(parts: VideoPart[] | null | undefined): VideoPart[] {
  if (!Array.isArray(parts)) return [];
  const valid = parts.filter((p) => p && typeof p.url === 'string' && p.url.trim());
  if (valid.length < 2) return [];
  // Recompute starts from durations so offsets always add up
  let offset = 0;
  return valid.map((p) => {
    const duration = Number(p.duration) > 0 ? Number(p.duration) : 0;
    const part = { ...p, url: p.url.trim(), start: offset, duration };
    offset += duration;
    return part;
  });
}

/** Index of the part that contains `position` (seconds on the whole-video timeline). */
export function partIndexAt(parts: VideoPart[], position: number): number {
  for (let i = parts.length - 1; i >= 0; i--) {
    if (position >= parts[i].start) return i;
  }
  return 0;
}

export function useVideoParts(rawParts: VideoPart[] | null | undefined, initialPosition: number) {
  const parts = useMemo(() => normalizeVideoParts(rawParts), [rawParts]);
  const isMultiPart = parts.length > 1;
  const [activeIndex, setActiveIndex] = useState(() => (isMultiPart ? partIndexAt(parts, initialPosition || 0) : 0));
  const activePart = isMultiPart ? parts[Math.min(activeIndex, parts.length - 1)] : null;
  const offset = activePart?.start ?? 0;
  const totalDuration = isMultiPart ? parts[parts.length - 1].start + parts[parts.length - 1].duration : 0;
  return { parts, isMultiPart, activeIndex, setActiveIndex, activePart, offset, totalDuration };
}

/** Stacked list of parts under the player; the current part is highlighted. */
export const VideoPartsList: React.FC<{
  parts: VideoPart[];
  activeIndex: number;
  /** Furthest position watched on the whole-video timeline, to tick finished parts. */
  watchedUpTo: number;
  onSelect: (index: number) => void;
}> = ({ parts, activeIndex, watchedUpTo, onSelect }) => (
  <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Film className="w-3.5 h-3.5 text-[#176B98]" />
        Video parts
      </h4>
      <span className="text-[11px] text-slate-500">
        Part {activeIndex + 1} of {parts.length} · plays continuously
      </span>
    </div>
    <ol className="space-y-1.5 max-h-48 overflow-y-auto pr-1" aria-label="Video parts">
      {parts.map((part, i) => {
        const isActive = i === activeIndex;
        const isDone = !isActive && watchedUpTo >= part.start + part.duration - 1;
        return (
          <li key={part.url}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={isActive ? 'true' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#176B98] border-[#176B98] text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-[#176B98]/50 hover:bg-sky-50'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/20' : isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isActive ? (
                  <Play className="w-3 h-3 fill-white ml-0.5" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="font-bold text-[10px]">{i + 1}</span>
                )}
              </span>
              <span className="font-bold flex-1">Part {i + 1}</span>
              <span className={`font-mono tabular-nums ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>
                {formatVideoClock(part.start)} – {formatVideoClock(part.start + part.duration)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </div>
);
