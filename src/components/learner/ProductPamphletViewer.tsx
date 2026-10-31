import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  RotateCcw,
  Target,
  Clock,
} from 'lucide-react';
import { ProductKnowledgeItem, ProductQuizAttempt } from '../../types/lms';
import { ProductRichTextRenderer } from '../common/ProductRichTextRenderer';
import { buildPamphletPages, PamphletContentPage, PamphletSection } from '../../lib/pamphlet';
import { ProductIcon } from '../../lib/productVisuals';

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
type PageDef =
  | { kind: 'cover' }
  | { kind: 'content'; page: PamphletContentPage; number: number }
  | { kind: 'quiz'; number: number }
  | { kind: 'back' };

interface QuizInfo {
  available: boolean;
  passingScore?: number;
  questionCount?: number;
  maxAttempts?: number;
}

interface ProductPamphletViewerProps {
  product: ProductKnowledgeItem;
  content: string;
  latestAttempt: ProductQuizAttempt | null;
  attemptsCount: number;
  quizInfo: QuizInfo;
  onTakeQuiz: () => void;
  /** Disable keyboard page turning (e.g. while the quiz modal is open) */
  keyboardEnabled?: boolean;
}

// KBZ brand blue (see --kbz-navy-dark / --kbz-brand-blue in index.css):
// every pamphlet uses the brand palette, whatever the product card colour.
const BRAND_THEME = { from: '#0F3E57', to: '#176B98', accent: '#a5e0f2' };

const FLIP_MS = 750;
const PAPER = '#fdfbf6';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------
export const ProductPamphletViewer: React.FC<ProductPamphletViewerProps> = ({
  product,
  content,
  latestAttempt,
  attemptsCount,
  quizInfo,
  onTakeQuiz,
  keyboardEnabled = true,
}) => {
  const theme = BRAND_THEME;

  // ---- Pages -------------------------------------------------------
  const { pages: contentPages, sections } = useMemo(() => buildPamphletPages(content), [content]);

  const sequence: PageDef[] = useMemo(
    () => [
      { kind: 'cover' },
      ...contentPages.map((page, i) => ({ kind: 'content' as const, page, number: i + 1 })),
      { kind: 'quiz', number: contentPages.length + 1 },
    ],
    [contentPages]
  );
  const lastIndex = sequence.length - 1;

  // ---- Layout: two-page spread on wide screens, single page on phones
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spreadMode = stageWidth >= 760;
  const pageWidth = spreadMode
    ? Math.min(470, Math.floor((stageWidth - 48) / 2))
    : Math.min(460, Math.max(260, stageWidth - 24));
  const pageHeight = Math.round(pageWidth * 1.38);

  // Spreads: [cover alone on the right], then pairs of pages
  const spreads = useMemo(() => {
    const list: { left: PageDef | null; right: PageDef | null }[] = [{ left: null, right: sequence[0] }];
    for (let i = 1; i < sequence.length; i += 2) {
      list.push({ left: sequence[i], right: sequence[i + 1] ?? { kind: 'back' } });
    }
    return list;
  }, [sequence]);

  const spreadOf = (pos: number) => (pos === 0 ? 0 : Math.floor((pos + 1) / 2));
  const firstPosOfSpread = (s: number) => (s === 0 ? 0 : 2 * s - 1);

  // ---- Navigation state -------------------------------------------
  const [pos, setPos] = useState(0); // index in `sequence`
  const [flip, setFlip] = useState<{ dir: 'next' | 'prev'; to: number } | null>(null);
  const flipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos((p) => Math.min(p, lastIndex));
  }, [lastIndex]);

  const currentSpread = spreadOf(pos);
  const canPrev = pos > 0;
  const canNext = spreadMode ? currentSpread < spreads.length - 1 : pos < lastIndex;

  const goTo = useCallback(
    (target: number, dir?: 'next' | 'prev') => {
      if (flip) return;
      const clamped = Math.max(0, Math.min(lastIndex, target));
      const normalized = spreadMode ? firstPosOfSpread(spreadOf(clamped)) : clamped;
      if (normalized === pos) return;
      const direction = dir ?? (normalized > pos ? 'next' : 'prev');
      const adjacent = spreadMode
        ? Math.abs(spreadOf(normalized) - currentSpread) === 1
        : Math.abs(normalized - pos) === 1;
      if (prefersReducedMotion() || !adjacent) {
        setPos(normalized);
        return;
      }
      setFlip({ dir: direction, to: normalized });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flip, lastIndex, spreadMode, pos, currentSpread]
  );

  const next = useCallback(() => {
    if (!canNext) return;
    goTo(spreadMode ? firstPosOfSpread(currentSpread + 1) : pos + 1, 'next');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canNext, spreadMode, currentSpread, pos, goTo]);

  const prev = useCallback(() => {
    if (!canPrev) return;
    goTo(spreadMode ? firstPosOfSpread(currentSpread - 1) : pos - 1, 'prev');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPrev, spreadMode, currentSpread, pos, goTo]);

  // Run the page-turn animation, then commit the new position
  useLayoutEffect(() => {
    if (!flip || !flipRef.current) return;
    const el = flipRef.current;
    const keyframes =
      flip.dir === 'next'
        ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }]
        : spreadMode
        ? [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }]
        : [{ transform: 'rotateY(-180deg)' }, { transform: 'rotateY(0deg)' }];
    const animation = el.animate(keyframes, {
      duration: FLIP_MS,
      easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      fill: 'forwards',
    });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setPos(flip.to);
      setFlip(null);
    };
    animation.onfinish = finish;
    return () => {
      animation.onfinish = null;
      animation.cancel();
    };
  }, [flip, spreadMode]);

  // Keyboard: ← / → turn pages
  useEffect(() => {
    if (!keyboardEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboardEnabled, next, prev]);

  // Touch: swipe to turn pages
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
  };

  // ---- Page renderers ---------------------------------------------
  const totalNumbered = contentPages.length + 1;

  const pageShell = (side: 'left' | 'right' | 'single', children: React.ReactNode, flat = false) => (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: flat ? undefined : PAPER,
        borderRadius: side === 'left' ? '6px 0 0 6px' : side === 'right' ? '0 6px 6px 0' : '4px 8px 8px 4px',
      }}
    >
      {children}
      {/* Spine shading and paper grain */}
      {!flat && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              side === 'left'
                ? 'linear-gradient(to left, rgba(0,0,0,0.13), rgba(0,0,0,0.04) 4%, transparent 9%)'
                : 'linear-gradient(to right, rgba(0,0,0,0.13), rgba(0,0,0,0.04) 4%, transparent 9%)',
          }}
        />
      )}
    </div>
  );

  const renderCover = (side: 'left' | 'right' | 'single') =>
    pageShell(side, <>
      {product.pamphlet_cover_url ? (
        <img
          src={product.pamphlet_cover_url}
          alt={`${product.title} pamphlet cover`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col text-white p-[8%]"
          style={{ background: `linear-gradient(160deg, ${theme.from} 0%, ${theme.to} 100%)` }}
        >
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/KBZ_Logo_28e9d8fb.png"
              alt=""
              className="h-8 w-auto bg-white rounded-md px-1.5 py-1"
              draggable={false}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">KBZ LIFE Insurance</span>
          </div>

          <div className="mt-[10%]">
            <span
              className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.15)', color: theme.accent }}
            >
              Product Knowledge Pamphlet
            </span>
            <h2 className="mt-3 text-[clamp(1.4rem,4.2vw,2.3rem)] font-black leading-[1.1] tracking-tight">
              {product.title}
            </h2>
            {product.subtitle && (
              <p className="mt-2 text-sm leading-snug text-white/85 font-medium">{product.subtitle}</p>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center py-[6%] min-h-0">
            <div className="w-[46%] aspect-square rounded-[28%] bg-white/12 border border-white/25 shadow-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <ProductIcon product={product} className="w-[58%] h-[58%] text-white" strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex items-end justify-between text-[10px] text-white/75 font-semibold uppercase tracking-wider">
            <span>{product.category || 'Insurance'}</span>
            <span>Learning &amp; Development</span>
          </div>
          <div className="absolute inset-y-0 left-0 w-3" style={{ background: 'rgba(0,0,0,0.18)' }} aria-hidden />
        </div>
      )}
    </>, true);

  const renderBack = (side: 'left' | 'right' | 'single') =>
    pageShell(side, <>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/85"
        style={{ background: `linear-gradient(200deg, ${theme.from} 0%, ${theme.to} 100%)` }}
      >
        <img
          src="/assets/aistudio/KBZ_Logo_28e9d8fb.png"
          alt=""
          className="h-12 w-auto bg-white rounded-lg px-2 py-1.5 opacity-95"
          draggable={false}
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.25em]">KBZ LIFE Insurance</p>
        <p className="text-[10px] text-white/60">Internal training material · Employee Learning Portal</p>
      </div>
    </>, true);

  const runningHeader = (section: string) => (
    <div className="flex items-center justify-between gap-3 pb-2 border-b border-stone-300/70 text-[9.5px] font-bold uppercase tracking-[0.14em] text-stone-500">
      <span className="truncate">{product.title}</span>
      <span className="truncate text-right" style={{ color: theme.to }}>
        {section}
      </span>
    </div>
  );

  const pageFooter = (number: number, side: 'left' | 'right' | 'single') => (
    <div
      className={`flex items-center gap-2 pt-2 border-t border-stone-300/70 text-[10px] text-stone-500 font-semibold ${
        side === 'left' ? 'justify-start' : 'justify-end'
      }`}
    >
      {side === 'left' && <span className="tabular-nums">{number}</span>}
      <span className="uppercase tracking-[0.14em]">KBZ LIFE · Product Knowledge</span>
      {side !== 'left' && <span className="tabular-nums">{number}</span>}
    </div>
  );

  const renderContent = (def: Extract<PageDef, { kind: 'content' }>, side: 'left' | 'right' | 'single') =>
    pageShell(side, <>
      <div className="absolute inset-0 flex flex-col px-[8%] pt-[6%] pb-[5%]">
        {runningHeader(def.page.title)}
        <div className="flex-1 min-h-0 overflow-y-auto pamphlet-scroll pr-1 pt-4">
          {def.page.continued ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 mb-1">
              {def.page.title} · continued
            </p>
          ) : (
            <div className="mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: theme.to }}>
                Section {def.page.sectionIndex + 1}
              </span>
              <h3 className="text-[clamp(1.05rem,2.4vw,1.35rem)] font-black text-stone-900 leading-tight tracking-tight mt-1">
                {def.page.title}
              </h3>
              <div className="mt-2 h-1 w-12 rounded-full" style={{ background: theme.to }} />
            </div>
          )}
          <ProductRichTextRenderer paper content={def.page.body} className="text-black text-[13.5px]" />
        </div>
        {pageFooter(def.number, side)}
      </div>
    </>);

  const renderQuiz = (def: Extract<PageDef, { kind: 'quiz' }>, side: 'left' | 'right' | 'single') =>
    pageShell(side, <>
      <div className="absolute inset-0 flex flex-col px-[8%] pt-[6%] pb-[5%]">
        {runningHeader('Knowledge Check')}
        <div className="flex-1 min-h-0 overflow-y-auto pamphlet-scroll pr-1 pt-5 flex flex-col">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
          >
            <Award className="w-6 h-6" />
          </div>
          <h3 className="mt-3 text-[clamp(1.1rem,2.6vw,1.45rem)] font-black text-stone-900 leading-tight tracking-tight">
            You've finished reading
          </h3>
          <p className="mt-1 text-[13px] text-stone-600 leading-relaxed">
            Check your understanding of <strong className="text-stone-800">{product.title}</strong> with a short quiz.
          </p>

          {sections.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {sections.slice(0, 6).map((s) => (
                <li key={s.title} className="flex items-start gap-2 text-[12px] text-stone-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  <span className="leading-snug">{s.title}</span>
                </li>
              ))}
              {sections.length > 6 && (
                <li className="text-[11px] text-stone-500 pl-5">+ {sections.length - 6} more sections</li>
              )}
            </ul>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white border border-stone-200 py-2">
              <ListOrdered className="w-3.5 h-3.5 mx-auto text-stone-400" />
              <p className="text-[13px] font-black text-stone-900 mt-0.5">{quizInfo.questionCount ?? '–'}</p>
              <p className="text-[9.5px] uppercase tracking-wider text-stone-500 font-bold">Questions</p>
            </div>
            <div className="rounded-xl bg-white border border-stone-200 py-2">
              <Target className="w-3.5 h-3.5 mx-auto text-stone-400" />
              <p className="text-[13px] font-black text-stone-900 mt-0.5">{quizInfo.passingScore ?? 80}%</p>
              <p className="text-[9.5px] uppercase tracking-wider text-stone-500 font-bold">To pass</p>
            </div>
            <div className="rounded-xl bg-white border border-stone-200 py-2">
              <Clock className="w-3.5 h-3.5 mx-auto text-stone-400" />
              <p className="text-[13px] font-black text-stone-900 mt-0.5">
                {quizInfo.maxAttempts ? `${Math.max(0, quizInfo.maxAttempts - attemptsCount)} left` : '∞'}
              </p>
              <p className="text-[9.5px] uppercase tracking-wider text-stone-500 font-bold">Attempts</p>
            </div>
          </div>

          {latestAttempt && (
            <div
              className={`mt-3 rounded-xl px-3 py-2 text-[12px] font-semibold border ${
                latestAttempt.passed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              Last score: <strong>{latestAttempt.percentage}%</strong> ·{' '}
              {latestAttempt.passed ? 'Passed' : 'Not passed yet'}
            </div>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={onTakeQuiz}
            disabled={!quizInfo.available}
            className="mt-4 w-full py-3.5 rounded-2xl text-white text-sm font-black tracking-wide shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] hover:brightness-110 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
          >
            <Award className="w-4 h-4" />
            <span>
              {!quizInfo.available ? 'Quiz not available yet' : latestAttempt ? 'Retake the Quiz' : 'Take the Quiz'}
            </span>
            {quizInfo.available && <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => goTo(0)}
            className="mt-2 w-full py-2 text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Read again from the cover
          </button>
        </div>
        {pageFooter(def.number, side)}
      </div>
    </>);

  const renderPage = (def: PageDef | null, side: 'left' | 'right' | 'single') => {
    if (!def) return null;
    switch (def.kind) {
      case 'cover':
        return renderCover(side);
      case 'back':
        return renderBack(side);
      case 'quiz':
        return renderQuiz(def, side);
      default:
        return renderContent(def, side);
    }
  };

  // ---- What is visible right now ----------------------------------
  let leftStatic: PageDef | null = null;
  let rightStatic: PageDef | null = null;
  let singleStatic: PageDef | null = null;
  let flipFront: PageDef | null = null;
  let flipBack: PageDef | null = null;
  let bookShiftSpread = currentSpread;

  if (spreadMode) {
    const from = spreads[currentSpread];
    if (flip) {
      const to = spreads[spreadOf(flip.to)];
      bookShiftSpread = spreadOf(flip.to);
      if (flip.dir === 'next') {
        leftStatic = from.left;
        rightStatic = to.right;
        flipFront = from.right;
        flipBack = to.left;
      } else {
        leftStatic = to.left;
        rightStatic = from.right;
        flipFront = from.left;
        flipBack = to.right;
      }
    } else {
      leftStatic = from.left;
      rightStatic = from.right;
    }
  } else if (flip) {
    singleStatic = flip.dir === 'next' ? sequence[flip.to] : sequence[pos];
    flipFront = flip.dir === 'next' ? sequence[pos] : sequence[flip.to];
  } else {
    singleStatic = sequence[pos];
  }

  // Closed cover (or closed back) is centred like a real pamphlet on a desk
  const bookShift = spreadMode && bookShiftSpread === 0 ? -pageWidth / 2 : 0;

  const pageLabel = (() => {
    const def = sequence[pos];
    if (def.kind === 'cover') return 'Cover';
    if (spreadMode) {
      const s = spreads[currentSpread];
      const nums = [s.left, s.right]
        .map((d) => (d && (d.kind === 'content' || d.kind === 'quiz') ? d.number : null))
        .filter((n): n is number => n !== null);
      return nums.length > 1 ? `Pages ${nums[0]}–${nums[1]} of ${totalNumbered}` : `Page ${nums[0]} of ${totalNumbered}`;
    }
    return def.kind === 'content' || def.kind === 'quiz' ? `Page ${def.number} of ${totalNumbered}` : '';
  })();

  const currentSectionIndex = (() => {
    const def = sequence[pos];
    if (def.kind === 'content') return def.page.sectionIndex;
    if (def.kind === 'quiz') return -2;
    return -1;
  })();

  const progress = spreadMode
    ? Math.round((currentSpread / Math.max(1, spreads.length - 1)) * 100)
    : Math.round((pos / Math.max(1, lastIndex)) * 100);

  // ---- Render ---------------------------------------------------------
  return (
    <section
      aria-label={`${product.title} product knowledge pamphlet`}
      className="rounded-3xl border border-stone-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-stone-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#176B98] dark:text-[#38bdf8]">
          <BookOpen className="w-4 h-4" />
          <span>Product Knowledge &amp; Curriculum</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`pamphlet-toc-${product.id}`}>
            Jump to section
          </label>
          <select
            id={`pamphlet-toc-${product.id}`}
            value={currentSectionIndex}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v === -1) goTo(0);
              else if (v === -2) goTo(lastIndex);
              else goTo((sections as PamphletSection[])[v].firstPage + 1);
            }}
            className="max-w-[180px] sm:max-w-[240px] px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-stone-700 dark:text-slate-200 cursor-pointer"
          >
            <option value={-1}>Cover</option>
            {sections.map((s, i) => (
              <option key={`${s.title}-${i}`} value={i}>
                {i + 1}. {s.title}
              </option>
            ))}
            <option value={-2}>Knowledge Check (Quiz)</option>
          </select>
        </div>
      </div>

      {/* Reading desk */}
      <div
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative select-text px-3 sm:px-6 py-8 sm:py-10 bg-[radial-gradient(ellipse_at_top,_#f1ece2_0%,_#e7dfd0_60%,_#ddd3c1_100%)] dark:bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_#0f172a_70%)]"
      >
        {stageWidth > 0 && (
          <div className="relative mx-auto" style={{ width: spreadMode ? pageWidth * 2 : pageWidth, height: pageHeight }}>
            <div
              className="absolute inset-0"
              style={{
                perspective: '2400px',
                transform: `translateX(${bookShift}px)`,
                transition: `transform ${FLIP_MS}ms cubic-bezier(0.645, 0.045, 0.355, 1)`,
              }}
            >
              {spreadMode ? (
                <>
                  {/* Soft shadow under the open pamphlet */}
                  <div
                    aria-hidden
                    className="absolute -bottom-4 rounded-[50%] blur-xl bg-black/25"
                    style={{
                      height: 28,
                      left: leftStatic ? '4%' : '54%',
                      right: '4%',
                      transition: `left ${FLIP_MS}ms`,
                    }}
                  />
                  <div className="absolute top-0 left-0 h-full" style={{ width: pageWidth }}>
                    {leftStatic && <div className="absolute inset-0 shadow-[-6px_8px_24px_rgba(0,0,0,0.18)] rounded-l-md">{renderPage(leftStatic, 'left')}</div>}
                    {leftStatic && !flip && canPrev && (
                      <button
                        type="button"
                        onClick={prev}
                        aria-label="Previous page"
                        className="group absolute bottom-0 left-0 w-14 h-14 cursor-pointer z-10"
                      >
                        <span className="absolute bottom-0 left-0 w-0 h-0 border-b-[0px] border-r-[0px] transition-all duration-200 group-hover:border-b-[28px] group-hover:border-r-[28px] border-b-stone-300 border-r-transparent" />
                      </button>
                    )}
                  </div>
                  <div className="absolute top-0 h-full" style={{ left: pageWidth, width: pageWidth }}>
                    {rightStatic && <div className="absolute inset-0 shadow-[6px_8px_24px_rgba(0,0,0,0.18)] rounded-r-md">{renderPage(rightStatic, 'right')}</div>}
                    {rightStatic && !flip && canNext && (
                      <button
                        type="button"
                        onClick={next}
                        aria-label="Next page"
                        className="group absolute bottom-0 right-0 w-14 h-14 cursor-pointer z-10"
                      >
                        <span className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-200 group-hover:border-b-[28px] group-hover:border-l-[28px] border-b-stone-300 border-l-transparent" />
                      </button>
                    )}
                  </div>
                  {/* Turning page */}
                  {flip && (
                    <div
                      ref={flipRef}
                      className="absolute top-0 h-full z-20"
                      style={{
                        width: pageWidth,
                        left: flip.dir === 'next' ? pageWidth : 0,
                        transformStyle: 'preserve-3d',
                        transformOrigin: flip.dir === 'next' ? 'left center' : 'right center',
                      }}
                    >
                      <div className="absolute inset-0 shadow-2xl" style={{ backfaceVisibility: 'hidden' }}>
                        {renderPage(flipFront, flip.dir === 'next' ? 'right' : 'left')}
                      </div>
                      <div
                        className="absolute inset-0 shadow-2xl"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        {renderPage(flipBack, flip.dir === 'next' ? 'left' : 'right')}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div aria-hidden className="absolute -bottom-3 left-[6%] right-[6%] h-6 rounded-[50%] blur-xl bg-black/25" />
                  <div className="absolute inset-0 shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-md">
                    {renderPage(singleStatic, 'single')}
                  </div>
                  {flip && (
                    <div
                      ref={flipRef}
                      className="absolute inset-0 z-20"
                      style={{ transformStyle: 'preserve-3d', transformOrigin: 'left center' }}
                    >
                      <div className="absolute inset-0 shadow-2xl" style={{ backfaceVisibility: 'hidden' }}>
                        {renderPage(flipFront, 'single')}
                      </div>
                      <div
                        className="absolute inset-0 rounded-md"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#efe9dc' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 py-3 border-t border-stone-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous page"
            disabled={!canPrev || Boolean(flip)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <p className="text-xs font-bold text-stone-600 dark:text-slate-300 tabular-nums" aria-live="polite">
            {pageLabel}
          </p>

          {pos === lastIndex || (spreadMode && currentSpread === spreads.length - 1) ? (
            <button
              type="button"
              onClick={onTakeQuiz}
              disabled={!quizInfo.available}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50 cursor-pointer"
              style={{ background: theme.to }}
            >
              <Award className="w-4 h-4" />
              <span>Take Quiz</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              aria-label={pos === 0 ? 'Open pamphlet' : 'Next page'}
              disabled={!canNext || Boolean(flip)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: theme.to }}
            >
              <span className="hidden sm:inline">{pos === 0 ? 'Open pamphlet' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Reading progress */}
        <div className="h-1.5 rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden" aria-hidden>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: theme.to }} />
        </div>
        <p className="text-[10.5px] text-stone-500 dark:text-slate-400 text-center">
          {spreadMode
            ? 'Tip: use the ← → keys or click the page corner to turn pages.'
            : 'Tip: swipe left or right, or use the arrows, to turn pages.'}
        </p>
      </div>
    </section>
  );
};
