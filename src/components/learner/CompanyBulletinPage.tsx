import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  SlidersHorizontal,
  X,
  Sparkles,
  ShieldCheck,
  Calendar,
  Tag,
  Building2,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { CompanyBulletinItem, BulletinCategory } from '../../types/lms';
import { PdfViewerModal } from '../common/PdfViewerModal';
import { SceneBackground } from '../../lib/productScenes';
import { resolveBulletinScene } from '../../lib/bulletinScenes';

// Helper for formatting time ago
function formatTimeAgo(isoString: string): string {
  if (!isoString) return 'Recently';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

/** One bulletin: a picture that matches the title on top (or on the left when featured), then the details. */
const BulletinCard: React.FC<{
  bulletin: CompanyBulletinItem;
  featured?: boolean;
  onOpen: (b: CompanyBulletinItem) => void;
}> = ({ bulletin, featured = false, onOpen }) => {
  const scene = resolveBulletinScene(bulletin);
  // Category first, then the bulletin's own tags, without repeats
  const tags = [...new Set([bulletin.category, ...(bulletin.tags || [])].filter(Boolean).map((t) => t.toLowerCase()))];
  return (
    <article
      onClick={() => onOpen(bulletin)}
      className={`group bg-white dark:bg-[#10243C] rounded-3xl border border-slate-100 dark:border-[#1E426D] shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer text-left flex ${
        featured ? 'flex-col md:flex-row' : 'flex-col'
      }`}
    >
      {/* Picture */}
      <div className={`relative isolate overflow-hidden shrink-0 ${featured ? 'h-48 sm:h-56 md:h-auto md:w-[42%] md:min-h-[280px]' : 'h-40'}`}>
        <SceneBackground scene={scene} blur={featured ? 3 : 2.5} className="-z-10" overlay={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/90 text-[#0f3b57] text-[10px] font-black uppercase tracking-wider shadow-sm">
            {bulletin.category}
          </span>
          {featured && (
            <span className="px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
              Latest
            </span>
          )}
          {bulletin.priority && bulletin.priority !== 'normal' && (
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              {bulletin.priority}
            </span>
          )}
        </div>
        <span className="absolute bottom-3 left-3 text-[11px] font-semibold text-white/90 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> {formatTimeAgo(bulletin.published_at)}
        </span>
      </div>

      {/* Details */}
      <div className={`flex-1 flex flex-col ${featured ? 'p-6 sm:p-8' : 'p-5'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {bulletin.verified !== false && (
            <span className="flex items-center gap-1 font-semibold text-[#25A9D2]">
              <CheckCircle2 className="w-3.5 h-3.5 fill-[#25A9D2] text-white shrink-0" />
              Verified Notice
            </span>
          )}
          {bulletin.department && (
            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Building2 className="w-3.5 h-3.5" /> {bulletin.department}
            </span>
          )}
        </div>
        <h3
          className={`mt-2 font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#176B98] dark:group-hover:text-[#38BDF8] transition-colors leading-snug ${
            featured ? 'text-xl sm:text-2xl line-clamp-3' : 'text-base line-clamp-2'
          }`}
        >
          {bulletin.title}
        </h3>
        <p
          className={`mt-2 text-slate-600 dark:text-slate-300 leading-relaxed ${
            featured ? 'text-sm line-clamp-4' : 'text-xs sm:text-[13px] line-clamp-3'
          }`}
        >
          {bulletin.description}
        </p>

        <div className="mt-auto pt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.slice(0, featured ? 5 : 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-[#F0EFFE] dark:bg-[#1E2545] text-[#7B78B8] dark:text-[#A5B4FC] text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-[#E5E3FB] dark:border-[#3730A3] lowercase"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(bulletin);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </article>
  );
};

export const CompanyBulletinPage: React.FC = () => {
  const { companyBulletins, currentUser } = useLms();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePdfBulletin, setActivePdfBulletin] = useState<CompanyBulletinItem | null>(null);

  // Filter only published bulletins for users
  const publishedBulletins = useMemo(() => {
    return companyBulletins.filter((b) => b.published === true || b.status === 'published');
  }, [companyBulletins]);

  // Categories list with counts
  const categories: { label: string; value: string; count: number }[] = useMemo(() => {
    const list: { label: string; value: string; count: number }[] = [
      { label: 'All', value: 'All', count: publishedBulletins.length },
      {
        label: 'Campaigns',
        value: 'Campaign',
        count: publishedBulletins.filter((b) => b.category === 'Campaign').length,
      },
      {
        label: 'Policy Memos',
        value: 'Policy Memo',
        count: publishedBulletins.filter((b) => b.category === 'Policy Memo').length,
      },
      {
        label: 'Announcements',
        value: 'Announcement',
        count: publishedBulletins.filter((b) => b.category === 'Announcement').length,
      },
      {
        label: 'Notices',
        value: 'Notice',
        count: publishedBulletins.filter((b) => b.category === 'Notice').length,
      },
      {
        label: 'Incentives',
        value: 'Incentive',
        count: publishedBulletins.filter((b) => b.category === 'Incentive').length,
      },
    ];
    // Hide empty categories (except "All")
    return list.filter((c) => c.value === 'All' || c.count > 0);
  }, [publishedBulletins]);

  // Filtered bulletins according to search query and category
  const filteredBulletins = useMemo(() => {
    let result = [...publishedBulletins];

    if (selectedCategory !== 'All') {
      result = result.filter(
        (b) => b.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          (b.reference_no && b.reference_no.toLowerCase().includes(q)) ||
          (b.tags && b.tags.some((t) => t.toLowerCase().includes(q))) ||
          (b.department && b.department.toLowerCase().includes(q))
      );
    }

    return result;
  }, [publishedBulletins, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-gradient-to-br from-[#F5F4FA] via-[#F3F4F9] to-[#ECEFF8] dark:from-[#0B131E] dark:via-[#0E2035] dark:to-[#0B131E] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* =====================================================================
            1. HERO & BULLETIN BANNER
            ===================================================================== */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-[#10243C]/90 border border-slate-200/80 dark:border-[#1E426D] shadow-2xs backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-[#176B98] dark:text-[#38BDF8]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#176B98] dark:text-[#38BDF8]">
              Official Corporate Repository
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-sans">
            Company Bulletin
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Stay aligned with nationwide sales campaigns, compliance directives, standard operating
            procedures, and official leadership notices.
          </p>
        </div>

        {/* =====================================================================
            2. SEARCH & CATEGORY FILTER BAR
            ===================================================================== */}
        <div className="bg-white/90 dark:bg-[#10243C]/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/70 dark:border-[#1E426D] shadow-xs space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements, sales campaigns, notices, or department topics..."
              className="w-full pl-11 pr-10 py-3 bg-[#F8FAFC] dark:bg-[#122842] border border-slate-200 dark:border-[#1E426D] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#176B98]/20 focus:border-[#176B98] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#176B98] text-white shadow-2xs'
                      : 'bg-[#F1F5F9] dark:bg-[#153252] text-slate-600 dark:text-slate-300 hover:text-[#176B98] dark:hover:text-[#38BDF8] hover:bg-slate-200/70 dark:hover:bg-[#183B60]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/90 dark:bg-[#1E426D] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            3. ANNOUNCEMENT CARDS LIST (Clean Corporate Bulletin Layout)
            ===================================================================== */}
        {filteredBulletins.length === 0 ? (
          <div className="bg-white dark:bg-[#10243C] rounded-3xl p-12 text-center border border-slate-200/70 dark:border-[#1E426D] shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Announcements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No bulletins match your current filter or query. Try adjusting your search keyword or selecting a different category.
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Latest bulletin, shown large */}
            <BulletinCard bulletin={filteredBulletins[0]} featured onOpen={setActivePdfBulletin} />
            {filteredBulletins.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBulletins.slice(1).map((bulletin) => (
                  <BulletinCard key={bulletin.id} bulletin={bulletin} onOpen={setActivePdfBulletin} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          4. SECURE IN-APP PDF VIEWER MODAL (VIEW-ONLY, NO DOWNLOAD)
          ===================================================================== */}
      {activePdfBulletin && (
        <PdfViewerModal
          isOpen={!!activePdfBulletin}
          onClose={() => setActivePdfBulletin(null)}
          fileUrl={activePdfBulletin.pdf_url}
          title={activePdfBulletin.title}
          subtitle={`${activePdfBulletin.category} · Published ${formatTimeAgo(activePdfBulletin.published_at)}`}
          fileName={activePdfBulletin.file_name}
          watermarkContextLabel={`CONFIDENTIAL · OFFICIAL KBZLIFE BULLETIN · ${activePdfBulletin.category.toUpperCase()}`}
        />
      )}
    </div>
  );
};
