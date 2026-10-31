import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { ProductKnowledgeItem, ProductQuizAttempt } from '../../types/lms';
import { useLms } from '../../context/LmsContext';
import { ProductQuizModal } from './ProductQuizModal';
import { ProductPamphletViewer } from './ProductPamphletViewer';
import { getProductRichContent } from '../../lib/productKnowledgeUtils';

interface ProductDetailPageProps {
  product: ProductKnowledgeItem;
  onBack: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
}) => {
  const { getUserProductAttempts, getProductQuiz } = useLms();
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<ProductQuizAttempt[]>([]);
  const [latestAttempt, setLatestAttempt] = useState<ProductQuizAttempt | null>(null);

  const loadAttempts = async () => {
    const userAttempts = await getUserProductAttempts(product.id);
    setAttempts(userAttempts);
    if (userAttempts.length > 0) {
      setLatestAttempt(userAttempts[0]);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, [product.id]);

  // Quiz details for the pamphlet's last page
  const [quizInfo, setQuizInfo] = useState<{
    available: boolean;
    passingScore?: number;
    questionCount?: number;
    maxAttempts?: number;
  }>({ available: true });
  useEffect(() => {
    let cancelled = false;
    getProductQuiz(product.id).then((quiz) => {
      if (cancelled) return;
      setQuizInfo(
        quiz && quiz.is_published !== false && (quiz.questions?.length ?? 0) > 0
          ? {
              available: true,
              passingScore: quiz.passing_score,
              questionCount: quiz.questions.length,
              maxAttempts: quiz.max_attempts || undefined,
            }
          : { available: false }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, getProductQuiz]);

  // Color theme mapping for the hero card
  const themeClasses: Record<string, { bg: string; text: string; badge: string; border: string }> = {
    amber: {
      bg: 'bg-gradient-to-r from-[#D97706] to-[#B45309]',
      text: 'text-white',
      badge: 'bg-amber-400 text-slate-950 font-black',
      border: 'border-amber-500',
    },
    navy: {
      bg: 'bg-gradient-to-r from-[#176B98] to-[#0F3E57]',
      text: 'text-white',
      badge: 'bg-sky-300 text-[#0F3E57] font-black',
      border: 'border-[#176B98]',
    },
    emerald: {
      bg: 'bg-gradient-to-r from-[#059669] to-[#047857]',
      text: 'text-white',
      badge: 'bg-emerald-300 text-emerald-950 font-black',
      border: 'border-emerald-500',
    },
    indigo: {
      bg: 'bg-gradient-to-r from-[#4F46E5] to-[#3730A3]',
      text: 'text-white',
      badge: 'bg-indigo-200 text-indigo-950 font-black',
      border: 'border-indigo-500',
    },
    teal: {
      bg: 'bg-gradient-to-r from-[#0D9488] to-[#0F766E]',
      text: 'text-white',
      badge: 'bg-teal-200 text-teal-950 font-black',
      border: 'border-teal-500',
    },
    rose: {
      bg: 'bg-gradient-to-r from-[#E11D48] to-[#BE123C]',
      text: 'text-white',
      badge: 'bg-rose-200 text-rose-950 font-black',
      border: 'border-rose-500',
    },
    sky: {
      bg: 'bg-gradient-to-r from-[#0284C7] to-[#0369A1]',
      text: 'text-white',
      badge: 'bg-sky-200 text-sky-950 font-black',
      border: 'border-sky-500',
    },
    slate: {
      bg: 'bg-gradient-to-r from-[#475569] to-[#334155]',
      text: 'text-white',
      badge: 'bg-slate-200 text-slate-950 font-black',
      border: 'border-slate-500',
    },
  };

  const theme = themeClasses[product.card_color_theme || 'navy'] || themeClasses.navy;

  // Full knowledge content: the admin's rich text, or one composed from the structured fields
  const pamphletContent = getProductRichContent(product);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#176B98] dark:text-[#38bdf8]" />
          <span>Back to Product Knowledge Hub</span>
        </button>

        {latestAttempt && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
              latestAttempt.passed
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Quiz Certification: {latestAttempt.passed ? 'PASSED' : 'RETAKE NEEDED'} ({latestAttempt.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Hero Banner Header (compact) */}
      <div
        className={`${theme.bg} rounded-2xl px-5 py-4 sm:px-7 sm:py-5 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        <div className="space-y-1.5 min-w-0 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${theme.badge}`}
            >
              {product.category || 'Insurance'}
            </span>
            <span className="text-white/80 text-[11px] font-semibold">KBZLife Official Portfolio</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{product.title}</h1>

          {product.subtitle && (
            <p className="text-xs sm:text-sm text-white/90 leading-snug font-medium">{product.subtitle}</p>
          )}
        </div>

        {/* Last quiz result (the quiz itself is on the pamphlet's last page) */}
        {latestAttempt && (
          <span className="shrink-0 z-10 text-xs text-white/85 font-semibold">
            Last scored {latestAttempt.percentage}% ({latestAttempt.passed ? 'Passed' : 'Needs retry'})
          </span>
        )}

        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
      </div>

      {/* Pamphlet View: cover → knowledge pages → quiz page */}
      <ProductPamphletViewer
        product={product}
        content={pamphletContent}
        latestAttempt={latestAttempt}
        attemptsCount={attempts.length}
        quizInfo={quizInfo}
        onTakeQuiz={() => setIsQuizModalOpen(true)}
        keyboardEnabled={!isQuizModalOpen}
      />

      {/* Quiz Assessment Modal */}
      <ProductQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        product={product}
        onSuccess={loadAttempts}
      />
    </div>
  );
};
