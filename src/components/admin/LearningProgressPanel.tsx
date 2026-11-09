/**
 * Admin → Learning Progress: every employee's progress in one place
 * (License Training chapters and lessons, quiz results in License
 * Training, Skill Development and Product Knowledge), with filters and an
 * Excel export.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { getSupabaseClient } from '../../lib/supabase';
import { DEPARTMENTS } from '../../lib/departments';
import { downloadXlsx } from '../../lib/xlsxWriter';
import type { Profile } from '../../types/lms';

interface LessonProgressRow {
  user_id: string;
  lesson_id: string;
  progress_percentage: number;
  completion_status: string;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  overall_completed: boolean;
  updated_at: string;
}
interface ChapterRow {
  user_id: string;
  chapter_id: string;
  status: string;
  quiz_passed: boolean;
  highest_quiz_score: number | null;
  completed_at: string | null;
  updated_at: string;
}
interface AttemptRow {
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  created_at: string;
  chapter_id?: string | null;
  lesson_id?: string | null;
  category_id?: string | null;
  product_id?: string | null;
}
type Area = 'License Training' | 'Skill Development' | 'Product Knowledge';

/** Reads every row of a table the admin can see (Supabase returns max 1000 per request). */
async function readAll<T>(table: string, columns: string): Promise<T[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const out: T[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) {
      console.warn(`[Progress] ${table}:`, error.message);
      break;
    }
    out.push(...((data || []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const typeLabel = (t?: string | null) => (t === 'internal' ? 'Internal' : t === 'external' ? 'External' : '');

export const LearningProgressPanel: React.FC = () => {
  const { profiles, licenseChapters, licenseTrainingLessons, licenseQuizzes, skillQuizzes, skillCategories, productQuizzes, products, showToast } =
    useLms();
  const [lessons, setLessons] = useState<LessonProgressRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [attempts, setAttempts] = useState<(AttemptRow & { area: Area })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [openUser, setOpenUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [lp, cc, la, sa, pa] = await Promise.all([
      readAll<LessonProgressRow>(
        'license_lesson_progress',
        'user_id, lesson_id, progress_percentage, completion_status, quiz_score, quiz_passed, overall_completed, updated_at'
      ),
      readAll<ChapterRow>('chapter_completions', 'user_id, chapter_id, status, quiz_passed, highest_quiz_score, completed_at, updated_at'),
      readAll<AttemptRow>('license_quiz_attempts', 'user_id, quiz_id, chapter_id, lesson_id, score, total_questions, percentage, passed, created_at'),
      readAll<AttemptRow>('skill_quiz_attempts', 'user_id, quiz_id, category_id, score, total_questions, percentage, passed, created_at'),
      readAll<AttemptRow>('product_quiz_attempts', 'user_id, quiz_id, product_id, score, total_questions, percentage, passed, created_at'),
    ]);
    setLessons(lp);
    setChapters(cc);
    setAttempts([
      ...la.map((a) => ({ ...a, area: 'License Training' as Area })),
      ...sa.map((a) => ({ ...a, area: 'Skill Development' as Area })),
      ...pa.map((a) => ({ ...a, area: 'Product Knowledge' as Area })),
    ]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // ---- Lookups -----------------------------------------------------------------
  const publishedChapters = useMemo(() => licenseChapters.filter((c) => c.is_published !== false), [licenseChapters]);
  const publishedLessons = useMemo(
    () => licenseTrainingLessons.filter((l) => l.is_published !== false && l.status !== 'draft'),
    [licenseTrainingLessons]
  );
  const chapterTitle = useMemo(() => new Map(licenseChapters.map((c) => [c.id, `Ch ${c.chapter_number}: ${c.title}`])), [licenseChapters]);
  const lessonTitle = useMemo(() => new Map(licenseTrainingLessons.map((l) => [l.id, l.title])), [licenseTrainingLessons]);
  const quizTitle = useMemo(() => {
    const m = new Map<string, string>();
    licenseQuizzes.forEach((q) => m.set(q.id, q.title));
    skillQuizzes.forEach((q) => m.set(q.id, q.title));
    productQuizzes.forEach((q) => m.set(q.id, q.title));
    return m;
  }, [licenseQuizzes, skillQuizzes, productQuizzes]);
  const categoryName = useMemo(() => new Map(skillCategories.map((c) => [c.id, c.name])), [skillCategories]);
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.title])), [products]);

  const attemptTopic = (a: AttemptRow & { area: Area }) =>
    a.area === 'License Training'
      ? (a.chapter_id && chapterTitle.get(a.chapter_id)) || (a.lesson_id && lessonTitle.get(a.lesson_id)) || quizTitle.get(a.quiz_id) || a.quiz_id
      : a.area === 'Skill Development'
      ? (a.category_id && categoryName.get(a.category_id)) || quizTitle.get(a.quiz_id) || a.quiz_id
      : (a.product_id && productName.get(a.product_id)) || quizTitle.get(a.quiz_id) || a.quiz_id;

  // ---- One summary row per employee -------------------------------------------
  const learners = useMemo(() => profiles.filter((p) => p.role !== 'admin'), [profiles]);
  const summary = useMemo(() => {
    return learners.map((u) => {
      const myChapters = chapters.filter((c) => c.user_id === u.id);
      const myLessons = lessons.filter((l) => l.user_id === u.id);
      const myAttempts = attempts.filter((a) => a.user_id === u.id);
      const byArea = (area: Area) => myAttempts.filter((a) => a.area === area);
      const best = (list: AttemptRow[]) => (list.length ? Math.max(...list.map((a) => a.percentage)) : null);
      const passedTopics = (list: (AttemptRow & { area: Area })[]) => new Set(list.filter((a) => a.passed).map((a) => attemptTopic(a))).size;
      const dates = [
        ...myChapters.map((c) => c.updated_at),
        ...myLessons.map((l) => l.updated_at),
        ...myAttempts.map((a) => a.created_at),
      ].filter(Boolean);
      const last = dates.sort().pop() || null;
      const chaptersDone = myChapters.filter((c) => c.quiz_passed || c.status === 'completed').length;
      const lessonsDone = myLessons.filter((l) => l.completion_status === 'completed' || l.overall_completed).length;
      const lic = byArea('License Training');
      const skill = byArea('Skill Development');
      const prod = byArea('Product Knowledge');
      return {
        user: u,
        chaptersDone,
        lessonsDone,
        licenseBest: best(lic),
        licenseAttempts: lic.length,
        skillPassed: passedTopics(skill),
        skillAttempts: skill.length,
        skillBest: best(skill),
        productPassed: passedTopics(prod),
        productAttempts: prod.length,
        productBest: best(prod),
        last,
        overall: publishedChapters.length ? Math.round((chaptersDone / publishedChapters.length) * 100) : 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learners, chapters, lessons, attempts, publishedChapters.length, chapterTitle, categoryName, productName, quizTitle]);

  const shown = summary.filter((s) => {
    const q = search.trim().toLowerCase();
    if (dept !== 'all' && (s.user.department || '') !== dept) return false;
    if (!q) return true;
    return [s.user.full_name, s.user.user_code, s.user.email, s.user.username, s.user.department].some((v) => (v || '').toLowerCase().includes(q));
  });

  const totals = useMemo(
    () => ({
      learners: shown.length,
      active: shown.filter((s) => s.last).length,
      completedLicense: shown.filter((s) => publishedChapters.length > 0 && s.chaptersDone >= publishedChapters.length).length,
      attempts: shown.reduce((n, s) => n + s.licenseAttempts + s.skillAttempts + s.productAttempts, 0),
    }),
    [shown, publishedChapters.length]
  );

  // ---- Excel ---------------------------------------------------------------------
  const exportExcel = () => {
    const ids = new Set(shown.map((s) => s.user.id));
    const who = (id: string) => profiles.find((p) => p.id === id);
    const userCols = (u?: Profile) => [u?.user_code || '', u?.full_name || '', u?.department || '', typeLabel(u?.employment_type), u?.email || ''];
    const pct = (v: number | null) => (v === null ? '' : v);

    const summarySheet = [
      [
        'User ID', 'Name', 'Department', 'Internal/External', 'Email', 'Account status',
        `License chapters passed (of ${publishedChapters.length})`, 'License completion %', `License lessons completed (of ${publishedLessons.length})`,
        'License quiz attempts', 'License best %', 'Skill quizzes passed', 'Skill attempts', 'Skill best %',
        'Product quizzes passed', 'Product attempts', 'Product best %', 'Last activity',
      ],
      ...shown.map((s) => [
        ...userCols(s.user), s.user.account_status,
        s.chaptersDone, s.overall, s.lessonsDone,
        s.licenseAttempts, pct(s.licenseBest), s.skillPassed, s.skillAttempts, pct(s.skillBest),
        s.productPassed, s.productAttempts, pct(s.productBest), fmtDate(s.last),
      ]),
    ];
    const chapterSheet = [
      ['User ID', 'Name', 'Department', 'Internal/External', 'Email', 'Chapter', 'Status', 'Quiz passed', 'Best score %', 'Completed on', 'Last update'],
      ...chapters
        .filter((c) => ids.has(c.user_id))
        .map((c) => [
          ...userCols(who(c.user_id)), chapterTitle.get(c.chapter_id) || c.chapter_id, c.status, c.quiz_passed,
          c.highest_quiz_score ?? '', fmtDate(c.completed_at), fmtDate(c.updated_at),
        ]),
    ];
    const lessonSheet = [
      ['User ID', 'Name', 'Department', 'Internal/External', 'Email', 'Lesson', 'Status', 'Progress %', 'Quiz score %', 'Quiz passed', 'Completed', 'Last update'],
      ...lessons
        .filter((l) => ids.has(l.user_id))
        .map((l) => [
          ...userCols(who(l.user_id)), lessonTitle.get(l.lesson_id) || l.lesson_id, l.completion_status, l.progress_percentage,
          l.quiz_score ?? '', l.quiz_passed ?? '', l.overall_completed, fmtDate(l.updated_at),
        ]),
    ];
    const attemptSheet = [
      ['User ID', 'Name', 'Department', 'Internal/External', 'Email', 'Area', 'Topic', 'Score', 'Questions', 'Percentage', 'Passed', 'Date'],
      ...attempts
        .filter((a) => ids.has(a.user_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((a) => [
          ...userCols(who(a.user_id)), a.area, attemptTopic(a), a.score, a.total_questions, a.percentage, a.passed,
          new Date(a.created_at).toLocaleString(),
        ]),
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadXlsx(`KBZLife_Learning_Progress_${stamp}`, [
      { name: 'Summary', rows: summarySheet },
      { name: 'License Chapters', rows: chapterSheet },
      { name: 'License Lessons', rows: lessonSheet },
      { name: 'Quiz Attempts', rows: attemptSheet },
    ]);
    showToast('success', 'Excel downloaded', `${shown.length} employees · ${attemptSheet.length - 1} quiz attempts`);
  };

  const pill = (v: number | null) =>
    v === null ? (
      <span className="text-slate-400">—</span>
    ) : (
      <span className={`font-bold ${v >= 80 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{v}%</span>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#176B98]" /> Learning Progress
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every employee's License Training, Skill Development and Product Knowledge progress. Export to Excel for reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export to Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Employees', totals.learners],
          ['With any activity', totals.active],
          ['Finished License Training', totals.completedLicense],
          ['Quiz attempts', totals.attempts],
        ].map(([label, value]) => (
          <div key={label as string} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, User ID, email…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200"
        >
          <option value="all">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading progress…
        </p>
      ) : (
        <>
          <p className="sm:hidden text-[11px] text-slate-500">↔ Swipe sideways to see all columns</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr className="text-left">
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5">License Training</th>
                  <th className="px-3 py-2.5">Skill quizzes</th>
                  <th className="px-3 py-2.5">Product quizzes</th>
                  <th className="px-3 py-2.5">Last activity</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No employees match.
                    </td>
                  </tr>
                )}
                {shown.map((s) => {
                  const open = openUser === s.user.id;
                  const myAttempts = attempts
                    .filter((a) => a.user_id === s.user.id)
                    .sort((a, b) => b.created_at.localeCompare(a.created_at));
                  return (
                    <React.Fragment key={s.user.id}>
                      <tr className="text-slate-700 dark:text-slate-200 align-top">
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{s.user.full_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {s.user.user_code && <span className="font-mono font-bold text-[#176B98] mr-1">{s.user.user_code}</span>}
                            {s.user.department}
                            {s.user.employment_type ? ` · ${typeLabel(s.user.employment_type)}` : ''}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-[#176B98]" style={{ width: `${s.overall}%` }} />
                            </div>
                            <span className="font-bold">{s.overall}%</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {s.chaptersDone}/{publishedChapters.length} chapters · {s.lessonsDone}/{publishedLessons.length} lessons · best {pill(s.licenseBest)}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          {s.skillPassed} passed · {s.skillAttempts} tries · {pill(s.skillBest)}
                        </td>
                        <td className="px-3 py-2.5">
                          {s.productPassed} passed · {s.productAttempts} tries · {pill(s.productBest)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{s.last ? fmtDate(s.last) : <span className="text-slate-400">No activity</span>}</td>
                        <td className="px-3 py-2.5">
                          {myAttempts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setOpenUser(open ? null : s.user.id)}
                              className="inline-flex items-center gap-1 text-[#176B98] font-bold cursor-pointer whitespace-nowrap"
                            >
                              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Attempts
                            </button>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                          <td colSpan={6} className="px-3 py-2">
                            <ul className="space-y-1">
                              {myAttempts.slice(0, 50).map((a, i) => (
                                <li key={i} className="flex flex-wrap gap-x-3 text-[11px] text-slate-600 dark:text-slate-300">
                                  <span className="w-28 shrink-0">{new Date(a.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                  <span className="w-32 shrink-0 font-semibold">{a.area}</span>
                                  <span className="flex-1 min-w-[160px]">{attemptTopic(a)}</span>
                                  <span className="font-mono">
                                    {a.score}/{a.total_questions}
                                  </span>
                                  {pill(a.percentage)}
                                  <span className={a.passed ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{a.passed ? 'Passed' : 'Not passed'}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
